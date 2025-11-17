class APIFeature {
  // Model.find, req.query
  constructor(query, queryString) {
    ((this.query = query), (this.queryString = queryString));
  }
  filter() {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete queryObj[el]);

    // Convert queryObj to string and replace operators
    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(eq|ne|gt|gte|lt|lte)\b/g,
      (match) => `$${match}`
    );
    const parsedQuery = JSON.parse(queryString);

    this.query = this.query.find(parsedQuery);

    return this;
  }
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createAt');
    }
    return this;
  }
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }
  pagination() {
    const limit = this.queryString.limit * 1 || 100;
    const page = this.queryString.page * 1 || 1;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeature;
