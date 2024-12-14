import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentBatchOperations } from '../../components/AgentBatchOperations';
import { AgentProvider } from '../../contexts/AgentContext';
import { mockAgentData } from '../__mocks__/agentData';
import '@testing-library/jest-dom';

// Mock file reader
const mockFileReader = {
  readAsText: jest.fn(),
  result: JSON.stringify([mockAgentData]),
  onload: jest.fn(),
};

// Mock file
const mockFile = new File(
  [JSON.stringify([mockAgentData])],
  'agents.json',
  { type: 'application/json' }
);

// Mock API calls
jest.mock('../../api/agents', () => ({
  createAgentBatch: jest.fn(() => Promise.resolve({ success: true, agents: [mockAgentData] })),
  validateAgentData: jest.fn(() => Promise.resolve({ valid: true })),
}));

describe('AgentBatchOperations', () => {
  const renderBatchOperations = () => {
    return render(
      <AgentProvider>
        <AgentBatchOperations />
      </AgentProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock FileReader
    window.FileReader = jest.fn(() => mockFileReader);
  });

  describe('File Upload', () => {
    it('allows JSON file upload', async () => {
      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('agents.json')).toBeInTheDocument();
      });
    });

    it('validates file type', async () => {
      renderBatchOperations();

      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByTestId('file-input');
      
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText('Invalid file type. Please upload a JSON file.')).toBeInTheDocument();
      });
    });

    it('validates file size', async () => {
      renderBatchOperations();

      const largeFile = new File(
        [JSON.stringify(Array(1000).fill(mockAgentData))],
        'large.json',
        { type: 'application/json' }
      );
      
      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText('File size exceeds maximum limit of 5MB')).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('validates agent data before upload', async () => {
      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByText('Upload Agents');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Validating data...')).toBeInTheDocument();
      });
    });

    it('displays validation errors', async () => {
      const invalidData = { ...mockAgentData, price: -1 };
      const invalidFile = new File(
        [JSON.stringify([invalidData])],
        'invalid.json',
        { type: 'application/json' }
      );

      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText('Invalid price')).toBeInTheDocument();
      });
    });
  });

  describe('Batch Upload', () => {
    it('shows upload progress', async () => {
      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByText('Upload Agents');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      });
    });

    it('displays success message after upload', async () => {
      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByText('Upload Agents');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Agents uploaded successfully!')).toBeInTheDocument();
      });
    });

    it('handles upload errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Upload failed'));

      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByText('Upload Agents');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Error uploading agents')).toBeInTheDocument();
      });
    });
  });

  describe('Template Download', () => {
    it('provides template download', () => {
      renderBatchOperations();

      const downloadButton = screen.getByText('Download Template');
      const mockUrl = 'blob:http://localhost:3000/123';
      const mockClick = jest.fn();

      window.URL.createObjectURL = jest.fn(() => mockUrl);
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockClick);

      fireEvent.click(downloadButton);

      expect(mockClick).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Reset Functionality', () => {
    it('allows resetting the form', async () => {
      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(screen.getByText('agents.json')).toBeInTheDocument();
      });

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(screen.queryByText('agents.json')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid JSON data', async () => {
      const invalidJsonFile = new File(
        ['invalid json'],
        'invalid.json',
        { type: 'application/json' }
      );

      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [invalidJsonFile] } });

      await waitFor(() => {
        expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      renderBatchOperations();

      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const uploadButton = screen.getByText('Upload Agents');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
