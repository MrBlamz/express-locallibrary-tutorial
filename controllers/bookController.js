const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookInstance');
const { body, validationResult } = require('express-validator');

const async = require('async');

exports.index = (req, res) => {
  async.parallel(
    {
      book_count(callback) {
        Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
      },
      book_instance_count(callback) {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count(callback) {
        BookInstance.countDocuments({ status: 'Available' }, callback);
      },
      author_count(callback) {
        Author.countDocuments({}, callback);
      },
      genre_count(callback) {
        Genre.countDocuments({}, callback);
      },
    },
    (err, results) => {
      res.render('index', {
        title: 'Local Library Home',
        error: err,
        data: results,
      });
    }
  );
};

// Display list of all books.
exports.book_list = (req, res, next) => {
  Book.find({}, 'title author')
    .sort({ title: 1 })
    .populate('author')
    .exec((err, list_books) => {
      if (err) return next(err);

      // Successful, so render
      res.render('book_list', { title: 'Book List', book_list: list_books });
    });
};

// Display detail page for a specific book.
exports.book_detail = (req, res, next) => {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate(['author', 'genre'])
          .exec(callback);
      },
      book_instance(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      // No results
      if (results.book === null) {
        const err = new Error('Book not found!');
        err.status = 404;
        return next(err);
      }

      // Successful, so render
      res.render('book_detail', {
        title: results.book.title,
        book: results.book,
        book_instances: results.book_instance,
      });
    }
  );
};

// Display book create form on GET.
exports.book_create_get = (req, res, next) => {
  // Get all authors and genres, which we can use for adding to our book
  async.parallel(
    {
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      res.render('book_form', {
        title: 'Create Book',
        authors: results.authors,
        genres: results.genres,
      });
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array
  (req, res, next) => {
    let { genre } = req.body;

    if (!Array.isArray(genre))
      genre = typeof genre === 'undefined' ? [] : [genre];

    next();
  },

  // Validate and sanitize fields
  body('title', 'Title must not be empty,')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('author', 'Author must not be empty')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('summary', 'Summary must not be empty')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('isbn', 'ISBN must not be empty')
    .trim()
    .isLength({ min: 10, max: 13 })
    .withMessage('ISBN must be 10-13 characters long.')
    .escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);
    const { title, author, summary, isbn, genre } = req.body;

    // Create a Book object with escaped and trimmed data
    const book = new Book({
      title,
      author,
      summary,
      isbn,
      genre,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) return next(err);

          // Mark our selected genres as checked.
          for (const genre of results.genres) {
            if (book.genre.includes(genre._id)) genre.checked = 'true';
          }

          res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array(),
          });
        }
      );

      return;
    }

    // Data from form is valid. Save book.
    book.save((err) => {
      if (err) return next(err);

      // Successful - redirect to new book record
      res.redirect(book.url);
    });
  },
];

// Display book delete form on GET.
exports.book_delete_get = (req, res, next) => {
  const { id } = req.params;

  async.parallel(
    {
      book(callback) {
        Book.findById(id).populate('author').exec(callback);
      },
      book_instances(callback) {
        BookInstance.find({ book: id }).exec(callback);
      },
    },
    (err, results) => {
      const { book, book_instances } = results;

      if (err) return next(err);

      if (book === null) {
        // No results
        res.redirect('/catalog/books');
      }

      // Successful, so render
      res.render('book_delete', {
        title: 'Delete Book',
        book,
        book_instances,
      });
    }
  );
};

// Handle book delete on POST.
exports.book_delete_post = (req, res, next) => {
  const { book_id } = req.body;

  async.parallel(
    {
      book(callback) {
        Book.findById(book_id).exec(callback);
      },
      book_instances(callback) {
        BookInstance.find({ book: book_id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      // Success
      const { book, book_instances } = results;

      if (book_instances.length > 0) {
        // Book has instances. Render in the same way as for GET route
        res.render('book_delete', {
          title: 'Delete',
          book,
          book_instances,
        });

        return;
      }

      // Book has no instances. Delete object and redirect to the list of books
      Book.findByIdAndRemove(book_id, (err) => {
        if (err) return next(err);

        // Success - go to book list
        res.redirect('/catalog/books');
      });
    }
  );
};

// Display book update form on GET.
exports.book_update_get = (req, res, next) => {
  // Get book, authors and genres for form.
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      const { book, authors, genres } = results;

      if (book === null) {
        // No results
        const err = new Error('Book not found!');
        err.status = 404;
        return next(err);
      }

      // Success
      // Mark our selected genres as checked
      for (const genre of genres) {
        for (const bookGenre of book.genre) {
          if (genre._id.toString() === bookGenre._id.toString()) {
            genre.checked = 'true';
          }
        }
      }

      res.render('book_form', {
        title: 'Update Book',
        authors,
        genres,
        book,
      });
    }
  );
};

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    let { genre } = req.body;

    if (!Array.isArray(genre)) {
      genre = typeof genre === 'undefined' ? [] : [genre];
    }

    next();
  },

  // Validate and sanitize fields
  body('title', 'Title must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('author', 'Author must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('summary', 'Summary must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('isbn', 'ISBN must not be empty.').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);
    const { id } = req.params;
    const { title, author, summary, isbn, genre } = req.body;

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title,
      author,
      summary,
      isbn,
      genre: typeof genre === 'undefined' ? [] : genre,
      _id: id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages

      // Get all authors and genres for form
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) return next(err);

          const { authors, genres } = results;

          // Mark our selected genres as checked
          for (const genre of genres) {
            if (book.genre.includes(genre._id)) {
              genre.checked = 'true';
            }
          }

          res.render('book_form', {
            title: 'Update Book',
            authors,
            genres,
            book,
            errors: errors.array(),
          });
        }
      );

      return;
    }

    // Data from form is valid. Update the record.
    Book.findByIdAndUpdate(id, book, (err, updatedBook) => {
      if (err) return next(err);

      // Successful: redirect to book detail page
      res.redirect(updatedBook.url);
    });
  },
];
