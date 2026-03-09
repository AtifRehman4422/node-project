const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favorites.controller');
const auth = require('../middleware/auth');

router.post('/', auth, favoritesController.add);
router.delete('/:listingId', auth, favoritesController.remove);
router.get('/', auth, favoritesController.list);
router.get('/check/:listingId', auth, favoritesController.check);

module.exports = router;
