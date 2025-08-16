// src/screens/PrecautionsScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar
} from 'react-native';

import { useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const API_KEY = 'f1ae2bd9d35f450fc63723d830ebb08d';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';


export default function PrecautionsScreen() {
  const route = useRoute();
  const { weatherData } = route.params || {}; // Get weatherData from navigation params

  const [llmLoading, setLlmLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]); 
  const [userInput, setUserInput] = useState('');

  const flatListRef = useRef(null); // Ref for FlatList to enable auto-scrolling

  // Helper to map OpenWeatherMap icon code to MaterialCommunityIcons icon name
  const getWeatherIconName = (iconCode) => {
    switch (iconCode) {
      case '01d': return 'weather-sunny';
      case '01n': return 'weather-night';
      case '02d': case '02n': return 'weather-partly-cloudy';
      case '03d': case '03n': return 'weather-cloudy';
      case '04d': case '04n': return 'weather-cloudy-alert';
      case '09d': case '09n': return 'weather-pouring';
      case '10d': return 'weather-rainy';
      case '10n': return 'weather-night-rainy';
      case '11d': case '11n': return 'weather-lightning';
      case '13d': case '13n': return 'weather-snowy';
      case '50d': case '50n': return 'weather-fog';
      default: return 'weather-cloudy';
    }
  };

  const generateBotResponse = async (currentWeather, userMessage = null) => {
    setLlmLoading(true);
    setError(null);

    if (!currentWeather) {
      setLlmLoading(false);
      setError('No weather data available to generate precautions.');
      return;
    }

    const { main: { temp, humidity }, wind: { speed: wind_speed }, weather: [{ description }] } = currentWeather;
    const cityName = weatherData.locationName;

    let prompt = `You are a helpful weather assistant. Based on the current weather conditions in ${cityName}:
    Temperature: ${temp}°C
    Humidity: ${humidity}%
    Wind Speed: ${wind_speed} m/s
    Weather: ${description}

    Provide concise safety precautions and advice.
    `;

    if (userMessage) {
        // If a user message is provided, instruct the LLM to filter non-weather queries
        prompt += `The user just said: "${userMessage}". If this message is not related to weather or safety, your ONLY response should be "I am here to suggest only weather." Otherwise, incorporate their message into your weather-related advice or respond to their weather-related query based on the current conditions provided.`;
    } else {
        // For the initial greeting, provide general advice based on current weather
        prompt += `Start with a friendly greeting and then give advice.`;
    }


    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {}, 
      };
      const apiKey = "AIzaSyAlgugmjL0Cxpr5GO_ARRny600qAKZX_vQ"; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setMessages(prevMessages => [...prevMessages, { type: 'bot', text: text }]);
      } else {
        throw new Error('No valid response from Weather Assistant.');
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('AI Assistant Error', err.message);
    } finally {
      setLlmLoading(false);
    }
  };

  // Effect to trigger initial bot message when weatherData is available
  useEffect(() => {
    if (weatherData && weatherData.current && messages.length === 0) {
      generateBotResponse(weatherData.current);
    } else if (!weatherData) {
        setError('No weather data received. Please go back to Current Weather and load data.');
    }
  }, [weatherData, messages.length]); // Add messages.length to dependencies to avoid re-triggering after first message

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);


  const handleSendUserMessage = async () => {
    if (userInput.trim() === '') return;

    const newUserMessage = { type: 'user', text: userInput.trim() };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setUserInput(''); // Clear input immediately

    // Generate bot response based on current weather AND user's specific input
    if (weatherData && weatherData.current) {
      await generateBotResponse(weatherData.current, newUserMessage.text);
    } else {
        setMessages(prevMessages => [...prevMessages, { type: 'bot', text: 'Please load weather data on the Current Weather screen first to use the assistant.' }]);
    }
  };


  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.type === 'user' ? styles.userBubble : styles.botBubble]}>
      <Text style={item.type === 'user' ? styles.userText : styles.botText}>
        {item.text}
      </Text>
    </View>
  );

  if (error && !weatherData) { // Show full screen error if no weather data was passed
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#007bff" barStyle="light-content" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorHintText}>
          Please go back to the "Current Weather" tab and load weather data before using the assistant.
        </Text>
      </View>
    );
  }

  // Once weatherData is available, show the chat UI
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#007bff" barStyle="light-content" />
      <Text style={styles.headerTitle}>Weather Assistant</Text>

      {/* Current Weather Display Card */}
      {weatherData && weatherData.current && (
        <View style={styles.weatherDisplayCard}>
          <Text style={styles.weatherLocationText}>
            {weatherData.locationName}, {weatherData.current.sys.country}
          </Text>
          <View style={styles.weatherInfoRow}>
            <MaterialCommunityIcons name={getWeatherIconName(weatherData.current.weather[0].icon)} size={40} color="#fff" style={styles.weatherDisplayIcon} />
            <Text style={styles.weatherTempText}>{Math.round(weatherData.current.main.temp)}°C</Text>
            <View style={styles.weatherDetailsColumn}>
              <Text style={styles.weatherDetailText}>Humidity: {weatherData.current.main.humidity}%</Text>
              <Text style={styles.weatherDetailText}>Wind: {weatherData.current.wind.speed} m/s</Text>
              <Text style={styles.weatherDetailText}>
                {weatherData.current.weather[0].description.charAt(0).toUpperCase() + weatherData.current.weather[0].description.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Chat Messages */}
      {llmLoading && messages.length === 0 ? ( // Only show full screen loading for initial LLM load
         <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color="#0000ff" />
           <Text style={styles.loadingText}>Assistant is thinking...</Text>
         </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })} // Auto-scroll
        />
      )}

      {/* LLM Specific Loading Indicator (within chat) */}
      {llmLoading && messages.length > 0 && (
          <View style={styles.llmLoadingIndicator}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.llmLoadingText}>Assistant thinking...</Text>
          </View>
      )}

      {/* Input Box */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask about precautions..."
          placeholderTextColor="#aaa"
          value={userInput}
          onChangeText={setUserInput}
          onSubmitEditing={handleSendUserMessage}
          editable={!llmLoading} // Disable input while LLM is loading
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendUserMessage}
          disabled={llmLoading} // Disable button while LLM is loading
        >
          <MaterialCommunityIcons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8', // Soft background
    alignItems: 'center',
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 15,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // Adjust for status bar
  },
  weatherDisplayCard: {
    backgroundColor: '#3498db', // Blue theme
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 10,
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  weatherLocationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  weatherInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherDisplayIcon: {
    marginRight: 15,
  },
  weatherTempText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 15,
  },
  weatherDetailsColumn: {
    flex: 1,
  },
  weatherDetailText: {
    fontSize: 14,
    color: '#e0f4f8',
    marginBottom: 2,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '100%',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginVertical: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6', // Light green for user
    borderBottomRightRadius: 5,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0', // Grey for bot
    borderBottomLeftRadius: 5,
  },
  userText: {
    color: '#333',
    fontSize: 16,
  },
  botText: {
    color: '#333',
    fontSize: 16,
  },
  llmLoadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  llmLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#007bff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10, // Adjust padding for iOS bottom safe area
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
});
