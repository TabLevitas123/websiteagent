import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Alerts endpoint' });
});

export default router;
