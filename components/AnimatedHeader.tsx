import React from 'react';
import { ScrollView } from 'react-native';
import Animated, {
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const AnimatedHeader: React.FC = () => {
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withSpring(scrollY.value > 50 ? -50 : 0)
                }
            ],
            opacity: withSpring(scrollY.value > 50 ? 0 : 1)
        };
    });

    return (
        <Animated.ScrollView
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            style={animatedStyle}
        >
            {/* Rest of the component code */}
        </Animated.ScrollView>
    );
};

export default AnimatedHeader; 