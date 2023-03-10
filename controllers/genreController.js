const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genre_list = (req, res, next) => {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, genre_list) {
      if (err) return next(err);

      // Successful, so render
      res.render('genre_list', {
        title: 'Genre List',
        genre_list,
      });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = (req, res, next) => {
  async.parallel(
    {
      genre(callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genre_books(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      // No results
      if (results.genre === null) {
        const err = new Error('Genre not found!');
        err.status = 404;
        return next(err);
      }

      // Successful, so render
      res.render('genre_detail', {
        title: 'Genre Detail',
        genre: results.genre,
        genre_books: results.genre_books,
      });
    }
  );
};

// Display Genre create form on GET.
exports.genre_create_get = (req, res) => {
  res.render('genre_form', {
    title: 'Create Genre',
  });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data
    const genre = new Genre({ name: req.body.name });

    // There are errors. Render the form again with sanitized values/error messages
    if (!errors.isEmpty()) {
      res.render('genre_form', {
        title: 'Create Genre',
        genre,
        errors: errors.array(),
      });

      return;
    }

    // Data from form is valid
    // Check if Genre with same name already exists
    Genre.findOne({ name: req.body.name }).exec((err, found_genre) => {
      if (err) return next(err);

      // Genre exists, redirect to its detail page
      if (found_genre) {
        res.redirect(found_genre.url);
        return;
      }

      genre.save((err) => {
        if (err) return next(err);

        // Genre saved. Redirect to genre detail page
        res.redirect(genre.url);
      });
    });
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = (req, res, next) => {
  const { id } = req.params;

  async.parallel(
    {
      genre(callback) {
        Genre.findById(id).exec(callback);
      },
      books(callback) {
        Book.find({ genre: id }).populate('author').exec(callback);
      },
    },
    (err, results) => {
      const { genre, books } = results;

      if (err) return next(err);

      res.render('genre_delete', {
        title: 'Delete Genre',
        genre,
        books,
      });
    }
  );
};

// Handle Genre delete on POST.
exports.genre_delete_post = (req, res, next) => {
  const { genre_id } = req.body;

  Genre.findByIdAndRemove(genre_id, (err) => {
    if (err) return next(err);

    // Success go to genres list
    res.redirect('/catalog/genres');
  });
};

// Display Genre update form on GET.
exports.genre_update_get = (req, res, next) => {
  const { id } = req.params;

  Genre.findById(id, (err, genre) => {
    if (err) return next(err);

    if (genre === null) {
      // No genre found
      const err = new Error('Genre not found!');
      err.status = 404;
      return next(err);
    }

    // Success
    res.render('genre_form', {
      title: 'Update Genre',
      genre,
    });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation sanitization
  (req, res, next) => {
    // Extract the validation errors from request
    const errors = validationResult(req);

    const { id } = req.params;
    const { name } = req.body;

    // Create a genre object with escaped and trimmed data and old id.
    const genre = new Genre({
      name,
      _id: id, // This is required or a new ID will be assigned!
    });

    // There are errors. Render the form again with sanitized values/error messages
    if (!errors.isEmpty()) {
      res.render('genre_form', {
        title: 'Update Genre',
        genre,
        errors: errors.array(),
      });

      return;
    }

    // Check if Genre with same name already exists
    Genre.findOne({ name }).exec((err, found_genre) => {
      if (err) return next(err);

      if (found_genre) {
        // Genre exists, render form again with sanitized values/error messages
        Genre.findById(id, (err, genre) => {
          if (err) return next(err);

          const error = new Error();
          error.msg = 'A genre with this name already exists!';

          res.render('genre_form', {
            title: 'Update Genre',
            genre,
            errors: [error],
          });
        });

        return;
      }

      // Data from form is valid. Update the record.
      Genre.findByIdAndUpdate(id, genre, (err, updatedGenre) => {
        if (err) return next(err);

        // Successful: redirect to genre detail page
        res.redirect(updatedGenre.url);
      });
    });
  },
];
