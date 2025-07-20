// main.js

const htmlMargin = 15;
const labelWidth = 120;
const barWidth = 250;

document.addEventListener("DOMContentLoaded", function () {
  const mapDataUrl = "mapData.json";

  // Custom JSON parser function to handle "True" and "False"
  function parseJSON(jsonString) {
    return JSON.parse(jsonString, (key, value) => {
      if (value === "True") return true;
      if (value === "False") return false;
      return value;
    });
  }

  function filterAndSortDataByDay_temp(mapData, selectedDay) {
    return mapData
      .filter((place) => {
        // Ensure that the required properties exist before accessing them
        return (
          place.places &&
          place.places[0] &&
          place.places[0].regularOpeningHours &&
          place.places[0].regularOpeningHours.periods &&
          Array.isArray(place.places[0].regularOpeningHours.periods) &&
          place.places[0].regularOpeningHours.periods.some(
            (period) =>
              period.open &&
              period.open.day === selectedDay &&
              !(period.open.day === 0 && period.open.hour === 0)
          )
        );
      })
      .sort((placeA, placeB) => {
        const openingTimeA = placeA.places[0].regularOpeningHours.periods.find(
          (period) =>
            period.open &&
            period.open.day === selectedDay &&
            !(period.open.day === 0 && period.open.hour === 0)
        );
        const openingTimeB = placeB.places[0].regularOpeningHours.periods.find(
          (period) =>
            period.open &&
            period.open.day === selectedDay &&
            !(period.open.day === 0 && period.open.hour === 0)
        );

        if (openingTimeA && openingTimeB) {
          const timeA = openingTimeA.open.minute + openingTimeA.open.hour * 60;
          const timeB = openingTimeB.open.minute + openingTimeB.open.hour * 60;

          return timeA - timeB;
        }

        return 0;
      });
  }

  // Function to filter and sort data by day and region grouping
  function filterAndSortDataByDay(mapData, selectedDay, regionGrouping) {
    return mapData
      .filter((place) => {
        // Ensure that the required properties exist before accessing them
        return (
          place.places &&
          place.places[0] &&
          place.places[0].regularOpeningHours &&
          place.places[0].regularOpeningHours.periods &&
          Array.isArray(place.places[0].regularOpeningHours.periods) &&
          place.places[0].regularOpeningHours.periods.some(
            (period) =>
              period.open &&
              period.open.day === selectedDay &&
              !(period.open.day === 0 && period.open.hour === 0)
          )
        );
      })
      .sort((placeA, placeB) => {
        const openingTimeA = placeA.places[0].regularOpeningHours.periods.find(
          (period) =>
            period.open &&
            period.open.day === selectedDay &&
            !(period.open.day === 0 && period.open.hour === 0)
        );
        const openingTimeB = placeB.places[0].regularOpeningHours.periods.find(
          (period) =>
            period.open &&
            period.open.day === selectedDay &&
            !(period.open.day === 0 && period.open.hour === 0)
        );

        if (openingTimeA && openingTimeB) {
          const timeA = openingTimeA.open.minute + openingTimeA.open.hour * 60;
          const timeB = openingTimeB.open.minute + openingTimeB.open.hour * 60;

          return timeA - timeB;
        }

        return 0;
      })
      .sort((placeA, placeB) => {
        // Additional sorting by 鄉鎮市 (town or city) if region grouping is enabled
        if (regionGrouping) {
          const townCityA = extractTownOrCity(placeA.places[0].formattedAddress);
          const townCityB = extractTownOrCity(placeB.places[0].formattedAddress);
          return townCityA.localeCompare(townCityB);
        }

        return 0;
      });
  }






  // Render Gantt chart bars for the selected day
  function renderGanttBars(container, periods, selectedDay) {
    periods
      .filter(
        (period) =>
          period.open && period.close && period.open.day === selectedDay
      )
      .forEach((period, index, array) => {
        const startMinute = period.open.hour * 60 + period.open.minute;
        const endMinute = period.close.hour * 60 + period.close.minute;

        const openTime = `${period.open.hour}:${period.open.minute < 10 ? '0' : ''}${period.open.minute}`;
        const closeTime = `${period.close.hour}:${period.close.minute < 10 ? '0' : ''}${period.close.minute}`;

        // Get the width of place-label
        //const labelWidth = container.querySelector(".place-label").offsetWidth;
        const bar = renderGanttBar(container, startMinute, endMinute, openTime, closeTime, labelWidth, barWidth);
        renderHourLines(container, labelWidth, barWidth);
      });
  }

  // Render separator line
  function renderSeparatorLine(container) {
    const separator = document.createElement("div");
    separator.classList.add("separator-line");
    container.appendChild(separator);
  }

  // Render individual Gantt chart bar
  function renderGanttBar(container, startMinute, endMinute, openTime, closeTime, labelWidth, barWidth) {
    const bar = document.createElement("div");
    bar.classList.add("bar");

    // Calculate the width and margin in percentage
    const totalMinutesInDay = 24 * 60;
    const widthPercentage =
      ((endMinute - startMinute) / totalMinutesInDay);
    const marginLeftPercentage = (startMinute / totalMinutesInDay);

    //bar.style.marginLeft = `${marginLeftPercentage}%`;
    bar.style.width = `${widthPercentage * barWidth}px`;
    bar.style.marginLeft = `${labelWidth + marginLeftPercentage * barWidth}px`;
    bar.style.position = "absolute";


    // Add open and close times at the starting and ending points
    /*
    const barLabel = document.createElement("div");
    barLabel.classList.add("bar-label");
    barLabel.textContent = `${openTime}-${closeTime}`;
    barLabel.style.marginLeft = `${labelWidth + marginLeftPercentage * barWidth}px`;

    // Calculate the bar's top position
    const containerTop = container.getBoundingClientRect().top;
    const barTop = bar.getBoundingClientRect().top;
    const marginTop = barTop - containerTop;

    barLabel.style.marginTop = `${marginTop}px`; // Set marginTop to match bar's position
    barLabel.style.position = "absolute";
    */

    bar.innerHTML = `<div class="bar-label">${openTime}-${closeTime}</div>`;

    container.appendChild(bar);
    //container.appendChild(barLabel);
    return bar; // Return the created bar element
  }

  // Render vertical lines for each hour
  function renderHourLines(container, labelWidth, barWidth) {
    const totalMinutesInDay = 24 * 60;

    for (let hour = 0; hour < 24; hour++) {
      const minute = hour * 60;

      const line = document.createElement("div");
      line.classList.add("hour-line");

      // Calculate the position of the hour line based on the percentage of the bar's width
      const positionPercentage = (minute / totalMinutesInDay);


      line.style.left = `${htmlMargin + labelWidth + positionPercentage * barWidth}px`;

      container.appendChild(line);
    }
  }

  // Update Gantt chart based on selected day
  function updateGanttChart(mapData, selectedDay) {
    const ganttChart = document.getElementById("ganttChart");
    const regionGroupingCheckbox = document.getElementById('regionGroupingCheckbox');

    // Clear previous content
    ganttChart.innerHTML = "";

    // Filter and sort places excluding 24-hour opening
    //const sortedData = filterAndSortDataByDay(mapData, selectedDay);
    const sortedData = filterAndSortDataByDay(mapData, selectedDay, regionGroupingCheckbox.checked);

    // Iterate through filtered and sorted data and render Gantt chart
    sortedData.forEach((place, index) => {
      const chartContainer = document.createElement("div");
      chartContainer.classList.add("gantt-chart-container");

      const formattedAddress = place.places[0].formattedAddress;
      const townOrCity = extractTownOrCity(formattedAddress);

      // 增加超連接
      const linkElement = document.createElement("a");
      //linkElement.href = `https://www.google.com/maps/place/?q=place_id:${place.places[0].id}`;
      linkElement.href = `https://www.google.com/maps/search/?api=1&query=formattedAddress&query_place_id=${place.places[0].id}`;
      linkElement.target = "_blank"; // Open the link in a new window
      linkElement.style.textDecoration = 'none'; // Remove underline

      const labelElement = document.createElement("div");
      labelElement.textContent = "[" + townOrCity + "]" + place.places[0].displayName.text;
      labelElement.classList.add("place-label");

      linkElement.appendChild(labelElement);
      chartContainer.appendChild(linkElement);

      //如果有營業時間，代表沒有歇業
      if (
        place.places[0].regularOpeningHours &&
        place.places[0].regularOpeningHours.periods
      ) {
        renderGanttBars(
          chartContainer,
          place.places[0].regularOpeningHours.periods,
          selectedDay
        );
      }

      ganttChart.appendChild(chartContainer);

      // Add a gray line between gantt-chart-containers, except for the last one
      if (index < sortedData.length - 1) {
        const separatorLine = document.createElement("div");
        separatorLine.classList.add("separator-line");
        ganttChart.appendChild(separatorLine);
      }
    });
  }

  // Event listener for day selector change
  const daySelector = document.getElementById("daySelector");
  daySelector.addEventListener("change", function () {
    fetchData()
      .then((mapData) => {
        const selectedDay = parseInt(daySelector.value);
        updateGanttChart(mapData, selectedDay);
      })
      .catch((error) => console.error("Error updating Gantt chart:", error));
  });

  // Fetch data from mapData.json
  function fetchData() {
    return fetch(mapDataUrl)
      .then((response) => response.text())
      .then((jsonString) => parseJSON(jsonString))
      .catch((error) => {
        console.error("Error fetching map data:", error);
        throw error;
      });
  }

  // Initial rendering with default selected day
  fetchData()
    .then((mapData) => {
      const initialDay = parseInt(daySelector.value);
      updateGanttChart(mapData, initialDay);
    })
    .catch((error) => console.error("Error initializing Gantt chart:", error));
});

// Function to extract town or city name from formatted address
function extractTownOrCity(address) {
  const match = address.match(/屏東縣([^鄉鎮市區村]+)/);
  return match ? match[1].trim() : ''; // 分離出在地址字串中，"鄉"、"鎮"、"市"、"區"、"村"
}

// Function to extract town or city name from formatted address
function extractTownOrCity_temp(address) {
  // Match and capture the town or city excluding postal code and "台灣"
  const match = address.match(/(?:\d{3}台灣)?([^鄉鎮市區村]+)/);
  return match ? match[1].trim() : ''; // Extract town or city excluding postal code and "台灣"
}
