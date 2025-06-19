const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store GeoJSON data in memory (for this microservice session)
let currentGeoJSON = null;

// API endpoint to receive GeoJSON data
app.post('/api/geojson', (req, res) => {
  try {
    currentGeoJSON = req.body;
    console.log('GeoJSON data received:', JSON.stringify(currentGeoJSON, null, 2));
    res.json({ success: true, message: 'GeoJSON data stored successfully' });
  } catch (error) {
    console.error('Error storing GeoJSON:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get current GeoJSON data
app.get('/api/geojson', (req, res) => {
  res.json(currentGeoJSON || { type: 'FeatureCollection', features: [] });
});

// API endpoint to fetch Wikipedia landmarks based on viewport bounds
app.get('/api/landmarks', async (req, res) => {
  try {
    const { north, south, east, west } = req.query;
    
    if (!north || !south || !east || !west) {
      return res.status(400).json({ error: 'Missing viewport bounds parameters' });
    }

    // Use GeoNames API to fetch nearby places
    const geonamesUrl = `http://api.geonames.org/searchJSON?north=${north}&south=${south}&east=${east}&west=${west}&maxRows=20&featureClass=T&username=demo`;
    
    const response = await axios.get(geonamesUrl);
    const landmarks = response.data.geonames || [];
    
    // Transform to GeoJSON format
    const landmarkFeatures = landmarks.map(landmark => ({
      type: 'Feature',
      properties: {
        name: landmark.name,
        country: landmark.countryName,
        population: landmark.population || 0,
        feature: landmark.fclName || 'Landmark',
        wikipediaUrl: landmark.wikipediaURL || null
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(landmark.lng), parseFloat(landmark.lat)]
      }
    }));

    res.json({
      type: 'FeatureCollection',
      features: landmarkFeatures
    });
  } catch (error) {
    console.error('Error fetching landmarks:', error);
    res.status(500).json({ error: 'Failed to fetch landmarks' });
  }
});

// Main map service endpoint
app.get('/map-service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'map-microservice', port: PORT });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Map microservice running on port ${PORT}`);
  console.log(`Access the map at: http://localhost:${PORT}/map-service`);
});

// Keep-alive mechanism
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Map service heartbeat - port ${PORT}`);
}, 30000); // Log every 30 seconds

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is busy, trying port ${PORT + 1}`);
    app.listen(PORT + 1, '0.0.0.0', () => {
      console.log(`Map microservice running on port ${PORT + 1}`);
    });
  }
});