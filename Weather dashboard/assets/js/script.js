const themeBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const ctx = document.getElementById("weatherChart").getContext("2d");

const labels = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
const weatherLevels = ["Rainy", "Cloudy", "Sunny", "Heavy"];

let chart;
let forecast = {};

const ui = {
  city: document.getElementById("span-text"),
  temp: document.getElementById("temp"),
  dayName: document.querySelector(".day-time p"),
  dayTime: document.querySelector(".day-time span"),
  weatherIcon: document.querySelector(".day-temp img"),
};

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
  themeIcon.classList.replace("fa-moon", "fa-sun");
}

themeBtn?.addEventListener("click", () => {
  const light = document.body.classList.toggle("light-mode");

  themeIcon.classList.toggle("fa-moon", !light);
  themeIcon.classList.toggle("fa-sun", light);

  localStorage.setItem("theme", light ? "light" : "dark");
});

function mapWeather(main, temp) {
  main = main.toLowerCase();

  if (
    main.includes("rain") ||
    main.includes("drizzle") ||
    main.includes("thunderstorm")
  ) {
    return "Rainy";
  }

  if (main.includes("cloud")) {
    return "Cloudy";
  }

  if (main.includes("clear")) {
    return temp > 28 ? "Heavy" : "Sunny";
  }

  return "Sunny";
}
function createChart(data = Array(6).fill("Sunny")) {
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data,
          borderColor: "#BBD7EC",
          backgroundColor: "rgba(187,215,236,.15)",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
        },
        y: {
          type: "category",
          labels: weatherLevels,
        },
      },
    },
  });
}

document.querySelectorAll(".day-cards").forEach((card) => {
  card.addEventListener("click", () => {
    const key = card.querySelector(".card-title").textContent.trim();

    updateDay(key);

    document
      .querySelectorAll(".day-cards")
      .forEach((c) => c.classList.remove("active-card-style"));

    card.classList.add("active-card-style");
  });
});

const API_KEY = "10a128c08ab14202eec6c3aa30d8415a";
const daysShort = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function getCoords(cityName) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.length === 0) throw new Error("Şəhər tapılmadı");
  return data[0];
}

async function fetchWeather(lat, lon) {
  const [nowRes, weekRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=az`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=az`)
  ]);
  return Promise.all([nowRes.json(), weekRes.json()]);
}

function updateDay(key) {
  const data = forecast[key];
  if (!data) return;

  if (ui.dayName) ui.dayName.textContent = data.dayName;
  if (ui.dayTime) ui.dayTime.textContent = data.time;
  if (ui.temp) ui.temp.textContent = data.temp;
  if (ui.weatherIcon) ui.weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

  const descLeft = document.querySelectorAll(".day-description-left p");
  if (descLeft.length >= 4) {
    descLeft[0].innerHTML = `Real Feel <b>${data.realFeel}</b>`;
    descLeft[1].innerHTML = `Wind N-E. <b>${data.wind}</b>`;
    descLeft[2].innerHTML = `Pressure <b>${data.pressure}</b>`;
    descLeft[3].innerHTML = `Humidity <b>${data.humidity}</b>`;
  }

  const descRight = document.querySelectorAll(".day-description-right p");
  if (descRight.length >= 2) {
    descRight[0].innerHTML = `Sunrise <b>${data.sunrise}</b>`;
    descRight[1].innerHTML = `Sunset <b>${data.sunset}</b>`;
  }

  if (chart) {
    chart.data.datasets[0].data = data.chartData;
    chart.update();
  }
}

async function run(cityName) {
  const q = String(cityName || "").trim();
  if (!q) return;

  try {
    const geo = await getCoords(q);
    const [now, weekData] = await fetchWeather(geo.lat, geo.lon);

    if (ui.city) ui.city.textContent = `${geo.name}, ${geo.country}`;

    const formatTime = (ts) => new Date(ts * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    forecast = {};
    const todayKey = daysShort[new Date().getDay()];

    weekData.list.forEach((item) => {
      const dateObj = new Date(item.dt_txt);
      const dayKey = daysShort[dateObj.getDay()];
      const dayName = daysFull[dateObj.getDay()];
      
      if (!forecast[dayKey]) {
        forecast[dayKey] = {
          dayName,
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          temp: Math.round(item.main.temp) + "°",
          realFeel: Math.round(item.main.feels_like) + "°",
          wind: `${item.wind.speed} km/h`,
          pressure: `${item.main.pressure} MB`,
          humidity: `${item.main.humidity}%`,
          sunrise: formatTime(now.sys.sunrise),
          sunset: formatTime(now.sys.sunset),
          icon: item.weather[0].icon,
          chartData: Array(6).fill("Sunny"), // Default olaraq hər saata Sunny veririk
          mappedHours: []
        };
      }

      labels.forEach((targetHour, idx) => {
        const targetHourNum = parseInt(targetHour.split(":")[0]);
        const currentHourNum = dateObj.getHours();

        if (Math.abs(currentHourNum - targetHourNum) < 3 && !forecast[dayKey].mappedHours.includes(targetHour)) {
          forecast[dayKey].chartData[idx] = mapWeather(item.weather[0].main, item.main.temp);
          forecast[dayKey].mappedHours.push(targetHour);
        }
      });
    });

    const tempElements = document.querySelectorAll(".day-cards .temp");
    document.querySelectorAll(".day-cards .card-title").forEach((title, index) => {
      const key = title.textContent.trim();
      if (forecast[key] && tempElements[index]) {
        tempElements[index].textContent = forecast[key].temp;
      }
    });

    const activeKey = forecast[todayKey] ? todayKey : Object.keys(forecast)[0];
    createChart(forecast[activeKey].chartData);
    updateDay(activeKey);

  } catch (error) {
    if (ui.city) ui.city.textContent = "Xəta: " + error.message;
    console.error(error);
  }
}

run("Baku");

const searchInput = document.querySelector(".nav-center input");
searchInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    run(searchInput.value);
  }
});