'use client';

import { useState } from 'react';

const API_ENDPOINTS = {
  admin: {
    listUsers: {
      method: 'query',
      path: '/api/trpc/admin.listUsers',
      input: {
        page: 'number (default: 1)',
        limit: 'number (default: 20, max: 100)',
        search: 'string (optional)',
      },
      output: {
        users: 'Array of User objects',
        pagination: 'Pagination info',
      },
    },
    getUser: {
      method: 'query',
      path: '/api/trpc/admin.getUser',
      input: {
        userId: 'string (required)',
      },
      output: {
        user: 'User object with OAuth accounts and session count',
      },
    },
    updateUser: {
      method: 'mutation',
      path: '/api/trpc/admin.updateUser',
      input: {
        userId: 'string (required)',
        data: {
          name: 'string (optional)',
          email: 'string (optional)',
        },
      },
      output: 'Updated user object',
    },
    deleteUser: {
      method: 'mutation',
      path: '/api/trpc/admin.deleteUser',
      input: {
        userId: 'string (required)',
      },
      output: {
        success: 'boolean',
      },
    },
    revokeUserSessions: {
      method: 'mutation',
      path: '/api/trpc/admin.revokeUserSessions',
      input: {
        userId: 'string (required)',
      },
      output: {
        success: 'boolean',
      },
    },
    getStats: {
      method: 'query',
      path: '/api/trpc/admin.getStats',
      input: 'none',
      output: {
        users: 'User statistics',
        sessions: 'Session statistics',
        oauth: 'OAuth statistics',
      },
    },
  },
  auth: {
    register: {
      method: 'mutation',
      path: '/api/trpc/auth.register',
      input: {
        email: 'string (required)',
        password: 'string (required)',
        name: 'string (optional)',
      },
      output: {
        user: 'User object',
        sessionId: 'string',
      },
    },
    login: {
      method: 'mutation',
      path: '/api/trpc/auth.login',
      input: {
        email: 'string (required)',
        password: 'string (required)',
      },
      output: {
        user: 'User object',
        sessionId: 'string',
      },
    },
    logout: {
      method: 'mutation',
      path: '/api/trpc/auth.logout',
      input: 'none',
      output: {
        success: 'boolean',
      },
    },
    me: {
      method: 'query',
      path: '/api/trpc/auth.me',
      input: 'none',
      output: {
        id: 'string',
        email: 'string',
        name: 'string',
        avatarUrl: 'string (optional)',
      },
    },
    getOAuthAccounts: {
      method: 'query',
      path: '/api/trpc/auth.getOAuthAccounts',
      input: 'none',
      output: 'Array of OAuth accounts',
    },
    unlinkOAuthAccount: {
      method: 'mutation',
      path: '/api/trpc/auth.unlinkOAuthAccount',
      input: {
        provider: 'string (required)',
      },
      output: {
        success: 'boolean',
      },
    },
  },
  example: {
    hello: {
      method: 'query',
      path: '/api/trpc/example.hello',
      input: {
        name: 'string (optional)',
      },
      output: {
        greeting: 'string',
        timestamp: 'Date',
      },
    },
    createItem: {
      method: 'mutation',
      path: '/api/trpc/example.createItem',
      input: {
        title: 'string (required)',
        description: 'string (optional)',
      },
      output: {
        id: 'string',
        title: 'string',
        description: 'string',
        createdAt: 'Date',
      },
    },
    list: {
      method: 'query',
      path: '/api/trpc/example.list',
      input: {
        limit: 'number (default: 10)',
        offset: 'number (default: 0)',
      },
      output: {
        items: 'Array',
        total: 'number',
        limit: 'number',
        offset: 'number',
      },
    },
  },
};

export default function ApiDocsPage() {
  const [selectedRouter, setSelectedRouter] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const testEndpoint = async (router: string, procedure: string, endpoint: any) => {
    const key = `${router}.${procedure}`;
    try {
      const response = await fetch(endpoint.path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Add test data based on endpoint
          ...(procedure === 'hello' ? { name: 'Test User' } : {}),
        }),
      });
      const data = await response.json();
      setTestResults({ ...testResults, [key]: data });
    } catch (error) {
      setTestResults({ ...testResults, [key]: { error: error.message } });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">API Documentation</h1>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p className="text-sm">
          This is a live API documentation for the tRPC endpoints. 
          All endpoints are type-safe and accessible via the tRPC client.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="col-span-1">
          <h2 className="text-lg font-semibold mb-3">Routers</h2>
          <ul className="space-y-2">
            {Object.keys(API_ENDPOINTS).map((router) => (
              <li key={router}>
                <button
                  onClick={() => setSelectedRouter(router)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedRouter === router
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {router}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main content */}
        <div className="col-span-3">
          {selectedRouter && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 capitalize">
                {selectedRouter} Router
              </h2>
              
              <div className="space-y-6">
                {Object.entries(API_ENDPOINTS[selectedRouter]).map(
                  ([procedure, endpoint]) => (
                    <div
                      key={procedure}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">{procedure}</h3>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            endpoint.method === 'query'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {endpoint.method}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Path:</span>{' '}
                          <code className="bg-gray-100 px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                        </div>
                        
                        <div>
                          <span className="font-medium">Input:</span>
                          {endpoint.input === 'none' ? (
                            <span className="text-gray-500 ml-2">None</span>
                          ) : (
                            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(endpoint.input, null, 2)}
                            </pre>
                          )}
                        </div>
                        
                        <div>
                          <span className="font-medium">Output:</span>
                          <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(endpoint.output, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {/* Test button for example endpoints */}
                      {selectedRouter === 'example' && (
                        <div className="mt-4">
                          <button
                            onClick={() =>
                              testEndpoint(selectedRouter, procedure, endpoint)
                            }
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Test Endpoint
                          </button>
                          
                          {testResults[`${selectedRouter}.${procedure}`] && (
                            <div className="mt-2">
                              <span className="text-sm font-medium">Result:</span>
                              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                                {JSON.stringify(
                                  testResults[`${selectedRouter}.${procedure}`],
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          
          {!selectedRouter && (
            <div className="text-center text-gray-500 mt-20">
              <p>Select a router from the sidebar to view its endpoints</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}