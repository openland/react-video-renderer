import * as React from 'react';

export const VideoTimingContext = React.createContext<number>(0);

export const useVideoTime = () => React.useContext(VideoTimingContext);