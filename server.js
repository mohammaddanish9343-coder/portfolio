const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { supabase, initPromise, tables } = require('./datab');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const parseId = (id) => {
  const parsed = Number.parseInt(id, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isDuplicateKeyError = (error) => {
  return error && (error.code === '23505' || String(error.message).includes('duplicate key'));
};

// ============ USER ROUTES ============

app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from(tables.users)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const { data, error } = await supabase
      .from(tables.users)
      .select('*')
      .eq('id', id)
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from(tables.users)
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingError) {
      return res.status(500).json({ error: 'Database error: ' + existingError.message });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const { data, error } = await supabase
      .from(tables.users)
      .insert({
        name,
        email,
        message: message || ''
      })
      .select('*')
      .limit(1);

    if (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  const { name, email, message } = req.body;
  const updates = {};

  if (typeof name !== 'undefined') updates.name = name;
  if (typeof email !== 'undefined') updates.email = email;
  if (typeof message !== 'undefined') updates.message = message;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  if (typeof updates.email !== 'undefined' && !isValidEmail(updates.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { data, error } = await supabase
      .from(tables.users)
      .update(updates)
      .eq('id', id)
      .select('id')
      .limit(1);

    if (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const { data, error } = await supabase
      .from(tables.users)
      .delete()
      .eq('id', id)
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

console.log('Waiting for Supabase connection check...');

const startServer = () => {
  initPromise
    .then(() => {
      const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('Available endpoints:');
        console.log('GET /api/health');
        console.log('GET /api/users');
        console.log('POST /api/users');
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use.`);
          process.exit(1);
        }

        console.error('Server error:', err);
        process.exit(1);
      });

      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully...');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    })
    .catch((err) => {
      console.error('Failed to initialize Supabase connection.');
      console.error(err.message);
      process.exit(1);
    });
};

startServer();
