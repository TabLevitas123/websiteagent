import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Threats endpoint' });
});

export default router;
