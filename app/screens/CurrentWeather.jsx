

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StatusBar,
  FlatList
} from 'react-native';

import { useNavigation } from '@react-navigation/native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // Used for all icons now
import { SafeAreaProvider } from 'react-native-safe-area-context';


const API_KEY = 'f1ae2bd9d35f450fc63723d830ebb08d';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const OPENWEATHER_GEOCODING_URL = 'https://api.openweathermap.org/geo/1.0/direct';


export default function CurrentWeatherScreen() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);
  const [currentLocationDisplayName, setCurrentLocationDisplayName] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyForecastOverview, setDailyForecastOverview] = useState([]);

  const navigation = useNavigation();


  // Helper function to format date/time
  const getFormattedDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getDayName = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getFormattedTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Helper to convert wind degrees to direction (simplified)
  const getWindDirection = (deg) => {
    if (deg > 337.5 || deg <= 22.5) return 'N';
    if (deg > 22.5 && deg <= 67.5) return 'NE';
    if (deg > 67.5 && deg <= 112.5) return 'E';
    if (deg > 112.5 && deg <= 157.5) return 'SE';
    if (deg > 157.5 && deg <= 202.5) return 'S';
    if (deg > 202.5 && deg <= 247.5) return 'SW';
    if (deg > 247.5 && deg <= 292.5) return 'W';
    if (deg > 292.5 && deg <= 337.5) return 'NW';
    return '';
  };

  // Helper to map OpenWeatherMap icon code to MaterialCommunityIcons icon name
  const getWeatherIconName = (iconCode) => {
    switch (iconCode) {
      case '01d': return 'weather-sunny'; // clear sky day
      case '01n': return 'weather-night'; // clear sky night
      case '02d': case '02n': return 'weather-partly-cloudy'; // few clouds
      case '03d': case '03n': return 'weather-cloudy'; // scattered clouds
      case '04d': case '04n': return 'weather-cloudy-alert'; // broken clouds
      case '09d': case '09n': return 'weather-pouring'; // shower rain
      case '10d': return 'weather-rainy'; // rain day
      case '10n': return 'weather-night-rainy'; // rain night
      case '11d': case '11n': return 'weather-lightning'; // thunderstorm
      case '13d': case '13n': return 'weather-snowy'; // snow
      case '50d': case '50n': return 'weather-fog'; // mist
      default: return 'weather-cloudy'; // Default icon
    }
  };


  const fetchWeather = async (latitude, longitude, locationNameOverride = null) => {
    setCardLoading(true);
    setError(null);

    try {
      // Fetch current weather
      const currentWeatherResponse = await fetch(
        `${OPENWEATHER_BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const currentWeatherData = await currentWeatherResponse.json();

      if (!currentWeatherResponse.ok || currentWeatherData.cod !== 200) {
        throw new Error(currentWeatherData.message || 'Failed to fetch current weather data');
      }

      // Fetch 5-day / 3-hour forecast
      const forecastResponse = await fetch(
        `${OPENWEATHER_BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastResponse.json();

      if (!forecastResponse.ok || forecastData.cod !== '200') {
        throw new Error(forecastData.message || 'Failed to fetch forecast data');
      }


      let finalLocationName = locationNameOverride;
      if (!finalLocationName && currentWeatherData.name) {
        finalLocationName = currentWeatherData.name;
      }
      setCurrentLocationDisplayName(finalLocationName || 'Unknown Location');

      // Process 3-hour forecast data for the top daily overview
      const dailyAggregated = {};
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyAggregated[date]) {
          dailyAggregated[date] = {
            minTemp: item.main.temp,
            maxTemp: item.main.temp,
            icon: item.weather[0].icon,
            dt: item.dt,
            description: item.weather[0].description,
            hourlyDetails: []
          };
        } else {
          dailyAggregated[date].minTemp = Math.min(dailyAggregated[date].minTemp, item.main.temp);
          dailyAggregated[date].maxTemp = Math.max(dailyAggregated[date].maxTemp, item.main.temp);
          if (item.weather[0].icon.endsWith('d')) {
            dailyAggregated[date].icon = item.weather[0].icon;
          }
        }
        dailyAggregated[date].hourlyDetails.push(item);
      });

      // Convert aggregated data to array for FlatList
      const processedDailyForecast = Object.values(dailyAggregated).slice(0, 5).map(day => ({
        dt: day.dt,
        minTemp: day.minTemp,
        maxTemp: day.maxTemp,
        icon: day.icon,
        description: day.description
      }));
      setDailyForecastOverview(processedDailyForecast);


      setWeatherData({
        current: currentWeatherData,
        forecast: forecastData,
        coords: { latitude, longitude },
        locationName: finalLocationName || 'Unknown Location'
      });
      console.log("Current Weather Data:", { current: currentWeatherData, forecast: forecastData });

    } catch (err) {
      setError(err.message);
      Alert.alert('Weather Fetch Error', err.message);
    } finally {
      setInitialLoading(false);
      setCardLoading(false);
      setIsRefreshing(false);
    }
  };


  const searchWeatherByCity = async (city) => {
    const finalCity = city || searchQuery;
    if (!finalCity.trim()) {
      Alert.alert('Please enter a city name.');
      return;
    }

    setCardLoading(true);
    setError(null);
    setWeatherData(null);
    setDailyForecastOverview([]);

    try {
      const geoResponse = await fetch(
        `${OPENWEATHER_GEOCODING_URL}?q=${encodeURIComponent(finalCity)}&limit=1&appid=${API_KEY}`
      );
      const geoData = await geoResponse.json();

      if (geoData.length === 0) {
        throw new Error('City not found. Please try a different city name.');
      }

      const { lat, lon, name, state, country } = geoData[0];
      let locationDisplayName = name;
      if (state) locationDisplayName += `, ${state}`;
      if (country) locationDisplayName += `, ${country}`;

      await fetchWeather(parseFloat(lat), parseFloat(lon), locationDisplayName);
      setSearchQuery('');

    } catch (err) {
      setError(err.message);
      Alert.alert('Search Error', err.message);
      setCardLoading(false);
      setIsRefreshing(false);
    }
  };


  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setError(null);

    if (weatherData && weatherData.coords) {
      fetchWeather(weatherData.coords.latitude, weatherData.coords.longitude, weatherData.locationName);
    } else {
      searchWeatherByCity('Hyderabad');
    }
  }, [weatherData]);


  useEffect(() => {
    console.log('CurrentWeatherScreen mounted. Setting default location to Hyderabad...');
    setInitialLoading(true);
    searchWeatherByCity('Hyderabad');
  }, []);


  if (initialLoading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#007bff" barStyle="light-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading Weather App...</Text>
      </View>
    );
  }

  const renderDailyForecastItem = ({ item }) => (
    <View style={styles.dailyForecastItemCard}>
      <Text style={styles.dailyForecastDay}>{getDayName(item.dt).substring(0, 3)}, {getFormattedDate(item.dt).split(' ')[1]} {getFormattedDate(item.dt).split(' ')[2]}</Text>
      <MaterialCommunityIcons name={getWeatherIconName(item.icon)} size={24} color="#333" style={styles.dailyForecastIcon} />
      <Text style={styles.dailyForecastTemp}>{Math.round(item.maxTemp)}°/{Math.round(item.minTemp)}°</Text>
    </View>
  );


  return (
    <SafeAreaProvider>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#007bff"
        />
      }
    >
      <StatusBar hidden={true} />
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Weather Forecast</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchWeatherByCity(searchQuery)}
          />
          <TouchableOpacity style={styles.searchIconButton} onPress={() => searchWeatherByCity(searchQuery)}>
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Current conditions</Text>

        {cardLoading ? (
          <View style={styles.mainWeatherCardLoading}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingTextCard}>Fetching weather...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTextCard}>Error: {error}</Text>
            <Text style={styles.errorHintTextCard}>Please try a different city.</Text>
          </View>
        ) : weatherData && weatherData.current ? (
          <>
            <View style={styles.mainWeatherCard}>
              <Text style={styles.cardLocationText}>
                {currentLocationDisplayName}
                {weatherData.current.sys.country && `, ${weatherData.current.sys.country}`}
              </Text>
              <View style={styles.tempIconRow}>
                <MaterialCommunityIcons name={getWeatherIconName(weatherData.current.weather[0].icon)} size={80} color="#fff" style={styles.weatherIcon} />
                <Text style={styles.cardCurrentTemp}>
                  {Math.round(weatherData.current.main.temp)}°C
                </Text>
              </View>
              <Text style={styles.cardDescription}>
                {weatherData.current.weather[0].description.charAt(0).toUpperCase() + weatherData.current.weather[0].description.slice(1)}
              </Text>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Feels like</Text>
                  <Text style={styles.detailValue}>{Math.round(weatherData.current.main.feels_like)}°C</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Humidity</Text>
                  <Text style={styles.detailValue}>{weatherData.current.main.humidity}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Wind</Text>
                  <Text style={styles.detailValue}>{weatherData.current.wind.speed} m/s</Text>
                </View>
              </View>
            </View>

            <View style={styles.conditionsGrid}>
              <View style={styles.conditionCard}>
                <Text style={styles.conditionLabel}>Wind</Text>
                <View style={styles.windDetails}>
                  <Text style={styles.conditionValue}>{Math.round(weatherData.current.wind.speed * 3.6)} kph</Text>
                  <View style={styles.windDirectionContainer}>
                    <Text style={styles.windDirectionText}>{getWindDirection(weatherData.current.wind.deg)}</Text>
                    <MaterialCommunityIcons name="arrow-up" size={24} color="#007bff" style={{ transform: [{ rotate: `${weatherData.current.wind.deg}deg` }] }} />
                  </View>
                </View>
                <Text style={styles.conditionSubLabel}>Moderate</Text>
                <Text style={styles.conditionSubLabel}>From {getWindDirection(weatherData.current.wind.deg).toLowerCase().replace('n', 'north').replace('s', 'south').replace('e', 'east').replace('w', 'west')}</Text>
              </View>

              <View style={styles.conditionCard}>
                <Text style={styles.conditionLabel}>Humidity</Text>
                <Text style={styles.conditionValue}>{weatherData.current.main.humidity}%</Text>
                <Text style={styles.conditionSubLabel}>Dew point</Text>
                <Text style={styles.conditionSubLabel}>{Math.round(weatherData.current.main.temp - ((100 - weatherData.current.main.humidity) / 5))}°</Text>
                <View style={styles.humidityBarBackground}>
                  <View style={[styles.humidityBarFill, { width: `${weatherData.current.main.humidity}%` }]} />
                </View>
                <Text style={styles.humidityBarLabel}>0                  100</Text>
              </View>

              <View style={styles.conditionCard}>
                <Text style={styles.conditionLabel}>UV index</Text>
                <Text style={styles.conditionValue}>3</Text>
                <Text style={styles.conditionSubLabel}>Moderate</Text>
                <View style={styles.uvIndexIndicator}>
                  <Text style={styles.uvIndexText}>11+</Text>
                </View>
              </View>

              <View style={styles.conditionCard}>
                <Text style={styles.conditionLabel}>Pressure</Text>
                <Text style={styles.conditionValue}>{weatherData.current.main.pressure} mBar</Text>
                <Text style={styles.conditionSubLabel}>Low High</Text>
                <MaterialCommunityIcons name="gauge" size={40} color="#007bff" />
              </View>
            </View>

            <Text style={styles.sectionHeader}>Sunrise & sunset</Text>
            <View style={styles.sunriseSunsetCard}>
              <View style={styles.sunriseSunsetRow}>
                <View style={styles.sunriseSunsetItem}>
                  <Text style={styles.sunriseSunsetLabel}>Sunrise</Text>
                  <Text style={styles.sunriseSunsetText}>{getFormattedTime(weatherData.current.sys.sunrise)}</Text>
                </View>
                <View style={styles.sunriseSunsetGraphContainer}>
                  <MaterialCommunityIcons name="weather-sunny" size={24} color="orange" style={{ position: 'absolute', top: 20, left: '50%', transform: [{ translateX: -12 }] }} />
                  <View style={styles.sunriseSunsetLine} />
                </View>
                <View style={styles.sunriseSunsetItem}>
                  <Text style={styles.sunriseSunsetLabel}>Sunset</Text>
                  <Text style={styles.sunriseSunsetText}>{getFormattedTime(weatherData.current.sys.sunset)}</Text>
                </View>
              </View>
              <View style={styles.daylightDetails}>
                <Text style={styles.daylightLabel}>Dawn</Text>
                <Text style={styles.daylightValue}>{getFormattedTime(weatherData.current.sys.sunrise)}</Text>
                <Text style={styles.daylightLabel}>Dusk</Text>
                <Text style={styles.daylightValue}>{getFormattedTime(weatherData.current.sys.sunset)}</Text>
              </View>
            </View>

          </>
        ) : (
          <Text style={styles.noDataText}>No weather data available. Search for a city.</Text>
        )}

        {weatherData && weatherData.coords && weatherData.locationName && (
          <>
            <TouchableOpacity
              style={styles.viewForecastButton}
              onPress={() => navigation.navigate('Forecast', {
                latitude: weatherData.coords.latitude,
                longitude: weatherData.coords.longitude,
                locationName: weatherData.locationName
              })}
            >
              <Text style={styles.viewForecastButtonText}>View 5-Day Forecast (Full)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewAssistantButton}
              onPress={() => navigation.navigate('Precautions', {
                weatherData: weatherData
              })}
            >
              <Text style={styles.viewAssistantButtonText}>Open Weather Assistant</Text>
            </TouchableOpacity>
          </>
        )}

      </View>
    </ScrollView>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: '#e0f2f7',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
  },
  searchIconButton: {
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -5,
  },
  mainWeatherCard: {
    backgroundColor: '#4a69bd',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 20,
  },
  cardLocationText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  tempIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  weatherIcon: {
    marginRight: 15,
  },
  cardCurrentTemp: {
    fontSize: 70,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDescription: {
    fontSize: 22,
    color: '#fff',
    marginBottom: 25,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#e0e0e0',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
  },
  loadingTextCard: {
    marginTop: 10,
    fontSize: 18,
    color: '#fff',
  },
  mainWeatherCardLoading: {
    backgroundColor: '#4a69bd',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHintText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorCard: {
    backgroundColor: '#ffdddd',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 20,
  },
  errorTextCard: {
    fontSize: 18,
    color: '#d9534f',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHintTextCard: {
    fontSize: 14,
    color: '#a94442',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  retryButtonCard: {
    marginTop: 15,
    backgroundColor: '#d9534f',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
  viewForecastButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  viewForecastButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAssistantButton: {
    marginTop: 10,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  viewAssistantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // NEW STYLES FOR DETAILED UI
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    alignSelf: 'flex-start',
    marginLeft: '5%',
    marginTop: 20,
    marginBottom: 15,
  },
  dailyForecastList: {
    paddingHorizontal: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  dailyForecastItemCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    width: 100,
    height: 120,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dailyForecastDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  dailyForecastIcon: {
    marginBottom: 5,
  },
  dailyForecastTemp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 20,
  },
  conditionCard: {
    backgroundColor: '#334466',
    borderRadius: 15,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    alignItems: 'flex-start',
  },
  conditionLabel: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 5,
  },
  conditionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  conditionSubLabel: {
    fontSize: 12,
    color: '#c0d4e9',
  },
  windDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  windDirectionContainer: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  windDirectionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    position: 'absolute',
  },
  humidityBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#5a7a9a',
    borderRadius: 4,
    marginTop: 10,
  },
  humidityBarFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  humidityBarLabel: {
    fontSize: 10,
    color: '#c0d4e9',
    marginTop: 5,
    width: '100%',
    textAlign: 'justify',
  },
  uvIndexIndicator: {
    width: 50,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'orange',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  uvIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  sunriseSunsetCard: {
    backgroundColor: '#334466',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sunriseSunsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sunriseSunsetItem: {
    alignItems: 'center',
  },
  sunriseSunsetLabel: {
    fontSize: 14,
    color: '#b0c4de',
    marginBottom: 5,
  },
  sunriseSunsetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sunriseSunsetGraphContainer: {
    flex: 1,
    height: 70,
    marginHorizontal: 15,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunriseSunsetLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#b0c4de',
    position: 'absolute',
    top: '50%',
  },
  daylightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  daylightLabel: {
    fontSize: 12,
    color: '#c0d4e9',
  },
  daylightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  hourlyDetailsPlaceholder: {
    backgroundColor: '#334466',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  hourlyPlaceholderText: {
    fontSize: 14,
    color: '#b0c4de',
    textAlign: 'center',
    marginBottom: 5,
  },
});
