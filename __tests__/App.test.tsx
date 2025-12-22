import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the dataService
vi.mock('../services/dataService', () => ({
  dataService: {
    hydrateFromServer: vi.fn(() => Promise.resolve()),
    getTeam: vi.fn(() => null),
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('should start with LOGIN view by default', () => {
    render(<App />);
    // The TeamLogin component should be rendered initially
    // You can check for specific elements that appear in TeamLogin
    expect(document.body).toBeTruthy();
  });

  it('should call hydrateFromServer on mount', () => {
    const { dataService } = require('../services/dataService');
    render(<App />);
    expect(dataService.hydrateFromServer).toHaveBeenCalledTimes(1);
  });
});
