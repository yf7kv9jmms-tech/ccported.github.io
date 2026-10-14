// Weather codes mapping to emoji icons
const weatherIcons = {
    0: '☀️',    // Clear sky
    1: '🌤️',    // Mainly clear
    2: '⛅️',    // Partly cloudy
    3: '☁️',    // Overcast
    45: '🌫️',   // Foggy
    48: '🌫️',   // Depositing rime fog
    51: '🌧️',   // Light drizzle
    53: '🌧️',   // Moderate drizzle
    55: '🌧️',   // Dense drizzle
    61: '🌧️',   // Slight rain
    63: '🌧️',   // Moderate rain
    65: '🌧️',   // Heavy rain
    71: '🌨️',   // Slight snow
    73: '🌨️',   // Moderate snow
    75: '🌨️',   // Heavy snow
    77: '🌨️',   // Snow grains
    80: '🌧️',   // Slight rain showers
    81: '🌧️',   // Moderate rain showers
    82: '🌧️',   // Violent rain showers
    85: '🌨️',   // Slight snow showers
    86: '🌨️',   // Heavy snow showers
    95: '⛈️',   // Thunderstorm
    96: '⛈️',   // Thunderstorm with slight hail
    99: '⛈️',   // Thunderstorm with heavy hail
};

// Function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Function to get weather data
async function getWeatherData() {
    try {
        // Get user's location (default to New York if geolocation fails)
        let latitude = 40.7128;
        let longitude = -74.0060;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
        } catch {
            console.log('Using default location (New York)');
        }
        window.pos = window.pos || {};
        window.pos.lat = latitude;
        window.pos.long = longitude;
        // Fetch weather data from Open-Meteo API
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?` +
            `latitude=${latitude}&longitude=${longitude}&` +
            `current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&` +
            `daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&` +
            `timezone=auto`
        );

        if (!response.ok) {
            throw new Error('Weather data fetch failed');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

// Function to update the UI with weather data
function updateUI(data) {
    // Update current weather
    const currentContainer = document.querySelector('#current div.l');
    currentContainer.innerHTML = `
                <h2>Current Weather</h2>
                <div class="temperature">${Math.round(data.current.temperature_2m)}${data.current_units.temperature_2m} (${otherUnit(data.current.temperature_2m, data.current_units.temperature_2m)})</div>
                <div class="weather-icon">${weatherIcons[data.current.weather_code] || '❓'}</div>
                <div class="conditions">
                    Feels like: ${Math.round(data.current.apparent_temperature)}${data.current_units.apparent_temperature}<br>
                    Humidity: ${data.current.relative_humidity_2m}${data.current_units.relative_humidity_2m}<br>
                    Precipitation: ${data.current.precipitation}${data.current_units.precipitation}
                </div>
            `;

    // Update forecast
    const forecastContainer = document.getElementById('forecast');
    forecastContainer.innerHTML = data.daily.time.map((date, index) => `
                <div class="forecast-day">
                    <div class="date">${formatDate(date)}</div>
                    <div class="weather-icon">${weatherIcons[data.daily.weather_code[index]] || '❓'}</div>
                    <div class="conditions">
                        High: ${Math.round(data.daily.temperature_2m_max[index])}${data.daily_units.temperature_2m_max} (${otherUnit(data.daily.temperature_2m_max[index], data.daily_units.temperature_2m_max)})<br>
                        Low: ${Math.round(data.daily.temperature_2m_min[index])}${data.daily_units.temperature_2m_min} (${otherUnit(data.daily.temperature_2m_min[index], data.daily_units.temperature_2m)})<br>
                        Rain: ${data.daily.precipitation_sum[index]}${data.daily_units.precipitation_sum}
                    </div>
                </div>
            `).join('');

    // Render the chart
    renderChart(data);
}

// Function to handle errors
function showError(message) {
    const container = document.querySelector('.w-container');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    container.insertBefore(errorDiv, container.firstChild);
}
// Initialize the weather dashboard
async function initWeather() {
    try {
        const wdata = await getWeatherData();
        updateUI(wdata);
    } catch (error) {
        console.error('Error initializing weather:', error);
        showError(`Failed to load weather data. Please try again later (${error.message})`);
    }
}

// Start the application
initWeather();
function otherUnit(value, unit) {
    if (unit === "°C") {
        return Math.round(convertToFahrenheit(value)) + "°F";
    } else if (unit === "°F") {
        return Math.round(convertToCelsius(value)) + "°C";
    }
    return value;
}
function convertToFahrenheit(celsius) {
    return (celsius * 9 / 5) + 32;
}
function convertToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5 / 9;
}

// Function to render the enhanced temperature line chart with rain bar chart
function renderChart(data) {
    // Prepare data
    const labels = data.daily.time.map(formatDate);
    const temps = data.daily.temperature_2m_max.map((max, i) =>
        (max + data.daily.temperature_2m_min[i]) / 2
    );
    const rain = data.daily.precipitation_sum;

    // Create or select chart container
    let chartContainer = document.getElementById('weather-chart-container');
    if (!chartContainer) {
        chartContainer = document.createElement('div');
        chartContainer.id = 'weather-chart-container';
        chartContainer.style.width = '100%';
        chartContainer.style.maxWidth = '700px';
        chartContainer.style.height = '320px';
        chartContainer.style.margin = '30px auto';
        chartContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
        chartContainer.style.borderRadius = '12px';
        chartContainer.style.padding = '20px';
        chartContainer.style.backgroundColor = '#ffffff';
        document.getElementById('forecast').after(chartContainer);
    }
    chartContainer.innerHTML = '<canvas id="weather-chart"></canvas>';

    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = '/vendor/chart.umd.min.js';
        script.onload = () => drawChart();
        document.head.appendChild(script);
    } else {
        drawChart();
    }

    // Function to create a gradient fill
    function createGradientFill(ctx, chartArea, startColor, endColor) {
        if (!ctx || !chartArea) {
            return startColor;
        }

        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, endColor);    // Transparent at bottom
        gradient.addColorStop(0.7, startColor); // Solid color near top

        return gradient;
    }

    function drawChart() {
        const ctx = document.getElementById('weather-chart').getContext('2d');

        // Set shadow for the line
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        if (window.weatherChart) window.weatherChart.destroy();

        // Colors
        const tempColor = '#ff7e29';    // Warmer orange
        window.weatherChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Avg Temp',
                        data: temps,
                        borderColor: tempColor,
                        backgroundColor: function (context) {
                            const chart = context.chart;
                            const { ctx, chartArea } = chart;

                            return createGradientFill(
                                ctx,
                                chartArea,
                                'rgba(255, 126, 41, 0.6)',
                                'rgba(255, 126, 41, 0.0)'
                            );
                        },
                        yAxisID: 'y',
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: '#ffffff',
                        pointBorderColor: tempColor,
                        pointBorderWidth: 2,
                        pointHoverRadius: 7,
                        pointHoverBackgroundColor: tempColor,
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2,
                        order: 1,
                        fill: true,
                        borderWidth: 3
                    },
                    {
                        type: 'bar',
                        label: 'Rain',
                        data: rain,
                        backgroundColor: 'rgba(77, 171, 247, 0.3)', // More transparent
                        borderColor: 'rgba(77, 171, 247, 0.5)',     // Lighter border
                        borderWidth: 0,                            // No border
                        borderRadius: 0,                           // Flat top, like volume bars
                        barPercentage: 1,                          // Make bars wider
                        categoryPercentage: 0.95,                  // Make bars nearly touch
                        yAxisID: 'y1',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 15,
                            font: {
                                family: "'Segoe UI', 'Helvetica', 'Arial', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        borderColor: '#ddd',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 5,
                        usePointStyle: true,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += Math.round(context.parsed.y) + data.daily_units.temperature_2m_max;
                                    } else {
                                        label += context.parsed.y + data.daily_units.precipitation_sum;
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        weight: 7,
                        title: {
                            display: true,
                            text: `Temperature (${data.daily_units.temperature_2m_max})`,
                            font: {
                                size: 12,
                                weight: 'normal'
                            },
                            padding: { top: 0, bottom: 10 }
                        },
                        beginAtZero: false,
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: true,
                            padding: 10,
                            font: {
                                size: 11
                            },
                            callback: function (value) {
                                return Math.round(value) + data.daily_units.temperature_2m_max;
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        max: findMax(rain) * 10, // 10% of chart
                        title: {
                            display: true,
                            text: `Precipitation (${data.daily_units.precipitation_sum})`,
                            font: {
                                size: 12,
                                weight: 'normal'
                            },
                            padding: { top: 0, bottom: 10 }
                        },
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

function findMax(arr) {
    return Math.max(...arr);
}