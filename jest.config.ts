import type {Config} from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testPathIgnorePatterns: ['test/types/.*'],
};

export default config;