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

export const Example = (props: { time: number }) => {
    return (
        <Container>
            <span>
                Example {props.time}
            </span>
        </Container>
    );
};