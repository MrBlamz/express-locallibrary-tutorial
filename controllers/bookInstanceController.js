const async = require('async');
const BookInstance = require('../models/bookInstance');
const Book = require('../models/book');
const { body, validationResult } = require('express-validator');

// Display list of all BookInstances.
exports.bookinstance_list = (req, res, next) => {
  BookInstance.find()
    .populate('book')
    .exec((err, list_bookInstances) => {
      if (err) return next(err);

      // Successful, so render
      res.render('bookInstance_list', {
        title: 'Book Instance List',
        bookInstance_list: list_bookInstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = (req, res, next) => {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, bookInstance) => {
      if (err) return next(err);

      // No results
      if (bookInstance === null) {
        const err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }

      // Successful, so render
      res.render('bookinstance_detail', {
        title: `Copy: ${bookInstance.book.title}`,
        bookInstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = (req, res, next) => {
  Book.find({}, 'title').exec((err, books) => {
    if (err) return next(err);

    // Successful, so render
    res.render('bookinstance_form', {
      title: 'Create BookInstance',
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitize fields
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data
    const { book, imprint, status, due_back } = req.body;
    const bookInstance = new BookInstance({
      book,
      imprint,
      status,
      due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages
      Book.find({}, 'title').exec((err, books) => {
        if (err) return next(err);

        // Successful, so render
        res.render('bookinstance_form', {
          title: 'Create BookInstance',
          book_list: books,
          selected_book: bookInstance.book._id,
          errors: errors.array(),
          selectedStatus: status,
          bookInstance,
        });
      });

      return;
    }

    // Data from form is valid
    bookInstance.save((err) => {
      if (err) next(err);

      // Successful: redirect to new record
      res.redirect(bookInstance.url);
    });
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = (req, res, next) => {
  const { id } = req.params;

  BookInstance.findById(id).exec((err, book_instance) => {
    if (err) return next(err);

    if (book_instance === null) {
      // No book instance
      res.redirect('/catalog/bookinstances');
    }

    console.log(book_instance);

    // Success, so render
    res.render('bookinstance_delete', {
      title: 'Delete Book Instance',
      book_instance,
    });
  });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = (req, res, next) => {
  const { book_instance_id } = req.body;

  BookInstance.findByIdAndRemove(book_instance_id, (err) => {
    if (err) return next(err);

    // Success go to book instances list
    res.redirect('/catalog/bookinstances');
  });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = (req, res, next) => {
  const { id } = req.params;

  async.parallel(
    {
      bookInstance(callback) {
        BookInstance.findById(id).populate('book').exec(callback);
      },
      books(callback) {
        Book.find({}, 'title').exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);

      const { bookInstance, books } = results;

      if (bookInstance === null) {
        // No results
        const err = new Error('Book instance not found!');
        err.status = 404;
        return next(err);
      }

      // Success
      res.render('bookinstance_form', {
        title: 'Update Book Instance',
        book_list: books,
        bookInstance,
        selected_book: bookInstance.book._id.toString(),
        selectedStatus: bookInstance.status,
      });
    }
  );
};

// Handle BookInstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitize fields
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from request
    const errors = validationResult(req);
    const { id } = req.params;
    const { book, imprint, due_back, status } = req.body;

    // Create a bookInstance object with escaped/trimmed data and old id.
    const bookInstance = new BookInstance({
      book,
      imprint,
      due_back,
      status,
      _id: id, // This is required or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages

      async.parallel(
        {
          bookInstance(callback) {
            BookInstance.findById(id).populate('book').exec(callback);
          },
          books(callback) {
            Book.find({}, 'title').exec(callback);
          },
        },
        (err, results) => {
          if (err) return next(err);

          const { bookInstance, books } = results;

          res.render('bookinstance_form', {
            title: 'Update Book Instance',
            book_list: books,
            bookInstance,
            selected_book: bookInstance.book._id.toString(),
            selectedStatus: bookInstance.status,
            errors: errors.array(),
          });
        }
      );

      return;
    }

    // Data from form is valid. Update the record.
    BookInstance.findByIdAndUpdate(
      id,
      bookInstance,
      (err, updatedBookInstance) => {
        if (err) return next(err);

        // Successful: redirect to bookinstance detail page
        res.redirect(updatedBookInstance.url);
      }
    );
  },
];
