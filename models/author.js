const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Virtual for author's full name
AuthorSchema.virtual('name').get(() => {
  // To avoid errors in cases where an author does not have either a family name or
  // first name, we want to make sure we handle the exception by returning an empty
  // string for that case

  if (this.first_name && this.family_name) {
    return `${this.family_name}, ${this.first_name}`;
  }

  return '';
});

AuthorSchema.virtual('url').get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/catalog/author/${this._id}`;
});

// Export model
module.exports = mongoose.model('Author', AuthorSchema);