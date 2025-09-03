import { useState, useEffect } from 'react';
import { envConfig } from '@/utils/envConfig';
import { qaService, QATestResult } from '@/services/qaService';

export const useQAMode = () => {
  const [isQAMode, setIsQAMode] = useState(envConfig.QA_ON);
  const [testResults, setTestResults] = useState<QATestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    // Auto-run tests if QA mode is enabled
    if (isQAMode && testResults.length === 0) {
      runTests();
    }
  }, [isQAMode]);

  const runTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await qaService.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Error running QA tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runSpecificTest = async (testName: string) => {
    const result = await qaService.runTest(testName);
    if (result) {
      setTestResults(prev => {
        const filtered = prev.filter((_, i, arr) => 
          arr.findIndex(r => r === result) !== i
        );
        return [...filtered, result];
      });
    }
  };

  const getTestSummary = () => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.status === 'pass').length;
    const failed = testResults.filter(r => r.status === 'fail').length;
    const skipped = testResults.filter(r => r.status === 'skip').length;

    return { total, passed, failed, skipped };
  };

  const captureError = (error: Error, context?: string) => {
    return qaService.captureError(error, context);
  };

  const getStoredErrors = () => {
    return qaService.getStoredErrors();
  };

  return {
    isQAMode,
    testResults,
    isRunningTests,
    runTests,
    runSpecificTest,
    getTestSummary,
    captureError,
    getStoredErrors,
    clearStoredErrors: qaService.clearStoredErrors.bind(qaService)
  };
};