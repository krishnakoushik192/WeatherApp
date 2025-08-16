// src/screens/ForecastScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';


const API_KEY = 'f1ae2bd9d35f450fc63723d830ebb08d';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

const HYDERABAD_LAT = 17.3850;
const HYDERABAD_LON = 78.4867;
const HYDERABAD_NAME = 'Hyderabad, IN';


const formatForecastDateTime = (dt_txt) => {
  const date = new Date(dt_txt);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    displayDate: `${dayName}, ${month} ${day}`,
    displayTime: time,
  };
};

export default function ForecastScreen() {
  const route = useRoute();
  const { latitude: paramLatitude, longitude: paramLongitude, locationName: paramLocationName } = route.params || {};

  const currentLatitude = paramLatitude || HYDERABAD_LAT;
  const currentLongitude = paramLongitude || HYDERABAD_LON;
  const currentDisplayLocationName = paramLocationName || HYDERABAD_NAME;

  // NEW LOGGING: Log the parameters received and resolved
  useEffect(() => {
    console.log('ForecastScreen: Raw route.params:', route.params);
    console.log('ForecastScreen: Resolved coordinates:', {
      currentLatitude,
      currentLongitude,
      currentDisplayLocationName
    });
  }, [route.params, currentLatitude, currentLongitude, currentDisplayLocationName]);


  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState([]);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const fetchForecast = async (lat, lon) => {
    setLoading(true);
    setError(null);

    try {
      // NEW LOGGING: Log the API call URL
      console.log(`ForecastScreen: Fetching forecast for lat=${lat}, lon=${lon}`);
      const forecastResponse = await fetch(
        `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      const data = await forecastResponse.json();

      if (!forecastResponse.ok || data.cod !== '200') {
        throw new Error(data.message || 'Failed to fetch forecast data');
      }

      const dailyForecasts = {};
      data.list.forEach(item => {
        const date = new Date(item.dt_txt);
        const dayKey = date.toISOString().split('T')[0];

        const hour = date.getHours();
        if (!dailyForecasts[dayKey] || Math.abs(hour - 11.5) < Math.abs(new Date(dailyForecasts[dayKey].dt_txt).getHours() - 11.5)) {
          dailyForecasts[dayKey] = item;
        }
      });

      const processedForecast = Object.values(dailyForecasts)
        .sort((a, b) => a.dt - b.dt);

      setForecastData(processedForecast);
      console.log("ForecastScreen: Processed Forecast Data:", processedForecast);

    } catch (err) {
      setError(err.message);
      Alert.alert('Forecast Error', err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setError(null);

    fetchForecast(currentLatitude, currentLongitude);
  }, [currentLatitude, currentLongitude]);


  useEffect(() => {
    fetchForecast(currentLatitude, currentLongitude);
  }, [currentLatitude, currentLongitude]);


  const renderForecastItem = ({ item }) => {
    const { displayDate, displayTime } = formatForecastDateTime(item.dt_txt);
    return (
      <View style={styles.forecastItemCard}>
        <View style={styles.forecastHeader}>
          <Text style={styles.forecastDay}>{displayDate}</Text>
          <Text style={styles.forecastTime}>{displayTime}</Text>
        </View>
        <View style={styles.forecastDetailsRow}>
          <FontAwesome name="cloud" size={40} color="#666" style={styles.forecastIcon} />
          <Text style={styles.forecastTemp}>{Math.round(item.main.temp)}°C</Text>
        </View>
        <Text style={styles.forecastDescription}>
          {item.weather[0].description.charAt(0).toUpperCase() + item.weather[0].description.slice(1)}
        </Text>
      </View>
    );
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#007bff" barStyle="light-content" />
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading forecast...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#007bff" barStyle="light-content" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorHintText}>Could not load forecast. Please try again later.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchForecast(currentLatitude, currentLongitude)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#007bff" barStyle="light-content" />
      <Text style={styles.headerTitle}>5-Day Forecast</Text>
      <Text style={styles.locationText}>{currentDisplayLocationName}</Text>

      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <FontAwesome name="refresh" size={18} color="#007bff" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>

      <FlatList
        data={forecastData}
        keyExtractor={(item) => item.dt.toString()}
        renderItem={renderForecastItem}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#007bff"
          />
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: '#e0f2f7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 20,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#555',
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
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 20,
    borderColor: '#007bff',
    borderWidth: 1,
  },
  refreshButtonText: {
    color: '#007bff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  flatListContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  forecastItemCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 8,
    width: 350,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  forecastTime: {
    fontSize: 16,
    color: '#666',
  },
  forecastDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  forecastIcon: {
    marginRight: 15,
  },
  forecastTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3498db',
  },
  forecastDescription: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 5,
  },
});
