import * as React from 'react';
import styled from 'styled-components';

const Container = styled.div({
    width: 640,
    height: 640,
    backgroundColor: 'red',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

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
        <Container>
            <span
                style={{
                    transform: `translateY(${initial * 100}px)`,
                    opacity: initial
                }}
            >
                Example {props.time}
            </span>
        </Container>
    );
};