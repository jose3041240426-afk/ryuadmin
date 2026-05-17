import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Svg, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const LimelightNav = ({ activeTab, onTabChange, isDark }) => {
  const styles = getStyles(isDark);
  const [tabWidth, setTabWidth] = useState(0);
  const limelightPos = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const tabs = [
    { 
      id: 'Dashboard', 
      customIcon: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path fill={color} d="M4 21V9l8-6l8 6v12h-6v-7h-4v7z" />
        </Svg>
      )
    },
    { id: 'IA', icon: 'sparkles-outline', activeIcon: 'sparkles' },
    { id: 'Configuracion', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(limelightPos, {
        toValue: activeIndex * tabWidth + (tabWidth / 2) - 22,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.navWrapper} onLayout={(e) => setTabWidth(e.nativeEvent.layout.width / tabs.length)}>
        {/* Limelight Effect */}
        <Animated.View 
          style={[
            styles.limelightContainer,
            { transform: [{ translateX: limelightPos }] }
          ]}
        >
          {/* Top Bar */}
          <View style={styles.limelightBar} />
          {/* Beam of Light */}
          <LinearGradient
            colors={['rgba(255, 0, 0, 0.25)', 'transparent']}
            style={styles.limelightBeam}
          />
        </Animated.View>

        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const iconColor = isActive ? '#ff0000' : (isDark ? '#888' : '#999');
          const iconSize = 24;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.8}
            >
              {tab.customIcon ? (
                <View style={{ opacity: isActive ? 1 : 0.6 }}>
                  {tab.customIcon(iconColor, iconSize)}
                </View>
              ) : (
                <Ionicons 
                  name={isActive ? tab.activeIcon : tab.icon} 
                  size={iconSize} 
                  color={iconColor} 
                  style={{ opacity: isActive ? 1 : 0.6 }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const getStyles = (isDark) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  navWrapper: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#1e1e1e' : '#fff',
    borderRadius: 20,
    height: 64,
    width: '100%',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  limelightContainer: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: '100%',
    alignItems: 'center',
    zIndex: 1,
  },
  limelightBar: {
    width: 44,
    height: 4,
    backgroundColor: '#ff0000',
    borderRadius: 2,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  limelightBeam: {
    width: 80,
    height: 60,
    position: 'absolute',
    top: 4,
  }
});

export default LimelightNav;
