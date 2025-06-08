export const serviceDiscovery = () => {
  const services = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
    genealogy: process.env.GENEALOGY_SERVICE_URL || 'http://localhost:3001',
    storage: process.env.STORAGE_SERVICE_URL || 'http://localhost:3005',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3003'
  };

  return services;
};

export const getServiceHealth = async (serviceName: string) => {
  const services = serviceDiscovery();
  const serviceUrl = services[serviceName as keyof typeof services];
  
  if (!serviceUrl) {
    throw new Error(`Service ${serviceName} not found`);
  }

  try {
    const response = await fetch(`${serviceUrl}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const validateServiceAvailability = async () => {
  const services = serviceDiscovery();
  const healthChecks = await Promise.allSettled(
    Object.entries(services).map(async ([name, url]) => {
      const isHealthy = await getServiceHealth(name);
      return { name, url, healthy: isHealthy };
    })
  );

  return healthChecks.map(result => 
    result.status === 'fulfilled' ? result.value : { name: 'unknown', url: 'unknown', healthy: false }
  );
};
