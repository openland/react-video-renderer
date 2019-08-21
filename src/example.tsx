import * as React from 'react';
import { XView, XImage } from 'react-mental';

const useAnimation = (time: number, start: number, end: number) => {
    if (time < start) {
        return 0;
    }
    if (end < time) {
        return 1;
    }
    return (time - start) / (end - start);
};

export const Example = (props: { time: number }) => {
    const initial = useAnimation(props.time, 1, 1.3);
    return (
        <XView width="100%" height="100%" justifyContent="center" alignItems="center">
            <XImage
                src="https://ucarecdn.com/6ca08ef7-c5a1-425a-bc40-7b554a6d8b46/Backwhite.png"
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
            />
            <XView
                position="absolute"
                top={0}
                left={0}
                width={60}
                height={60}
                backgroundColor="red"
                borderRadius={30}
            />

            <XView
                alignSelf="center"
            >
                <span
                    style={{
                        // transform: `translateY(${initial * 100}px)`,
                        opacity: initial
                    }}
                >
                    Example {props.time}
                </span>
            </XView>
        </XView>
    );
};