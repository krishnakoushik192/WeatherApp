import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CurrentWeather from "../screens/CurrentWeather";
import ForecastScreen from "../screens/ForecastScreen";
import Icon from 'react-native-vector-icons/Ionicons';
import Precautions from "../screens/Precautions";


const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Current Weather') {
                        const iconName = 'cloud-outline';
                        return <Icon name={iconName} size={size} color={color} />;
                    }
                    if (route.name === 'Forecast') {
                        const iconName = 'calendar-outline';
                        return <Icon name={iconName} size={size} color={color} />;
                    }
                    if (route.name === 'Precautions') {
                        const iconName = 'shield-outline';
                        return <Icon name={iconName} size={size} color={color} />;
                    }
                },
            })}
        >
            <Tab.Screen name="Current Weather" component={CurrentWeather} />
            <Tab.Screen name="Forecast" component={ForecastScreen} />
            <Tab.Screen name="Precautions" component={Precautions} />
        </Tab.Navigator>
    )
};

export default TabNavigator;
