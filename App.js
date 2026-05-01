import React from 'react';
import { StatusBar } from 'expo-status-bar';
import SpeedScreen from './src/screens/SpeedScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <SpeedScreen />
    </>
  );
}
