import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

const ModernTabBar = ({ state, descriptors, navigation, isDarkMode }) => {
  return (
    <View style={[
      styles.tabBarContainer,
      styles.shadow
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabItem
            key={route.key}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            isDarkMode={isDarkMode}
            routeName={route.name}
          />
        );
      })}
    </View>
  );
};

const TabItem = ({ label, isFocused, onPress, isDarkMode, routeName }) => {
  const animatedWidth = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;
  const textTranslateX = useRef(new Animated.Value(isFocused ? 0 : 15)).current;
  const textOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const textScale = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;

  useEffect(() => {
    // Animación de ancho y color (Motor JS - No soporta Native Driver)
    Animated.spring(animatedWidth, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    // Animaciones de transformación y opacidad (Motor Nativo - Mucho más fluido)
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: isFocused ? 1 : 0.8,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(textTranslateX, {
        toValue: isFocused ? 0 : 15,
        useNativeDriver: true,
        friction: 7,
        tension: 35,
      }),
      Animated.spring(textOpacity, {
        toValue: isFocused ? 1 : 0,
        useNativeDriver: true,
        duration: 200,
      }),
      Animated.spring(textScale, {
        toValue: isFocused ? 1 : 0.5,
        useNativeDriver: true,
        friction: 7,
      })
    ]).start();

    // Rebote de icono (Nativo)
    if (isFocused) {
      bounceValue.setValue(0);
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(bounceValue, {
          toValue: 0,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused]);

  const getIcon = () => {
    const color = isFocused ? '#ff0000' : '#ffffff';
    const size = 22;

    const sushiIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><ellipse cx='12.07' cy='7' fill='${color}' rx='3' ry='1.71'/><path fill='${color}' d='M12.07 22c4.48 0 8-2.2 8-5V7c0-2.8-3.52-5-8-5s-8 2.2-8 5v10c0 2.8 3.51 5 8 5m0-18c3.53 0 6 1.58 6 3a2 2 0 0 1-.29.87c-.68 1-2.53 2-5 2.12h-1.39C8.88 9.83 7 8.89 6.35 7.84a2.2 2.2 0 0 1-.28-.76V7c0-1.42 2.46-3 6-3'/></svg>`;
    const bebidasIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><path fill='${color}' d='M6 8H3L2 2h5M1 1V0h3v2H3V1'/></svg>`;
    const extrasIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><g fill='none' fill-rule='evenodd'><path d='m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z'/><path fill='${color}' d='M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m4.5 8.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m-4.5 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3m-4.5 0a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3'/></g></svg>`;
    const historialIcon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='${color}' d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M9 17H7v-7h2zm4 0h-2V7h2zm4 0h-2v-4h2z'/></svg>`;

    switch (routeName) {
      case 'Sushi':
        return <SvgXml xml={sushiIcon} width={size} height={size} />;
      case 'Alitas':
        return <Image source={require('../../assets/images/Alitasicon.png')} style={{ width: size, height: size, tintColor: color }} />;
      case 'Bebidas':
        return <SvgXml xml={bebidasIcon} width={size} height={size} />;
      case 'Extras':
        return <SvgXml xml={extrasIcon} width={size} height={size} />;
      case 'Historial':
        return <SvgXml xml={historialIcon} width={size} height={size} />;
      default:
        return null;
    }
  };

  const flexValue = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const backgroundColor = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)'],
  });

  return (
    <Animated.View style={[styles.tabItem, { flex: flexValue, backgroundColor: backgroundColor }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={1}
        style={styles.touchable}
      >
        <Animated.View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          transform: [{ scale: scaleValue }] 
        }}>
          <Animated.View style={{ transform: [{ translateY: bounceValue }] }}>
            {getIcon()}
          </Animated.View>
          
          {isFocused && (
            <Animated.Text
              numberOfLines={1}
              style={[
                styles.tabLabel,
                {
                  color: '#ff0000',
                  opacity: textOpacity,
                  transform: [
                    { translateX: textTranslateX },
                    { scale: textScale }
                  ],
                }
              ]}
            >
              {label}
            </Animated.Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 70,
    marginHorizontal: 15,
    marginBottom: Platform.OS === 'ios' ? 30 : 15,
    borderRadius: 35,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    backgroundColor: '#ff0000',
  },
  tabItem: {
    height: 50,
    borderRadius: 25,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});

export default ModernTabBar;
