const { DateTime } = require('luxon');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Virtual for author's full name
AuthorSchema.virtual('name').get(function () {
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

AuthorSchema.virtual('lifespan').get(function () {
  const dateOfBirthFormatted = this.date_of_birth
    ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED)
    : '';

  const dateOfDeathFormatted = this.date_of_death
    ? DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED)
    : '';

  const lifeSpan = `${dateOfBirthFormatted} - ${dateOfDeathFormatted}`;

  return lifeSpan === ' - ' ? 'No Data' : lifeSpan;
});

AuthorSchema.virtual('death_date').get(function () {
  return this.date_of_birth
    ? DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED)
    : '';
});

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
