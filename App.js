import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LiveNavigation from './components/LiveNavigation';
import Fingerprints from './components/Fingerprints';
import HomeScreen from './components/HomeScreen';
// import AutoConnection from './components/AutoConnection';
import WifiScan from './components/WifiScan';
import Robot from './components/Robot';
// import LocationScreen from './components/Location';


const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* the first stack screen will be loaded first and will have all the buttons to navigate to the other screens */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        <Stack.Screen name="LiveNav" component={LiveNavigation} options={{ title: 'Localization' }} />
        <Stack.Screen name="Fingerprints" component={Fingerprints} options={{ title: 'Manual Collection' }} />
        <Stack.Screen name="Robot" component={Robot} options={{ title: 'Robot' }} />
        {/* <Stack.Screen name="Location" component={LocationScreen} options={{ title: 'Location IMU' }} /> */}
        {/* <Stack.Screen name="Serial" component={AutoConnection} options={{ title: 'Serial Com' }} /> */}
        <Stack.Screen name="Wifi" component={WifiScan} options={{ title: 'Scan Wifi' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default App;