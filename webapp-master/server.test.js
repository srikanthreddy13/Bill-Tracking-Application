const app = require('./server') // Link to your server file
const supertest = require('supertest')
const request = supertest(app)

// to test the post endpoint for user
describe('Post Endpoints', () => {
  it('should create a new user', async () => {
    const res = await supertest(app)
      .post('/v1/user')
      .send({
        first_name: "Jane",
        last_name: "Doe",
        password: "Cloud007",
        email_address: "jane.doe@example.com"
      })
    expect(res.statusCode).toEqual(201)
    // expect(res.body).toHaveProperty('post')
  })
});

// to test the post endpoint for user
describe('Post Endpoints', () => {
  it('should throw an error when create a new user', async () => {
    const res = await supertest(app)
      .post('/v1/user')
      .send({
        first_name: "Jane",
        last_name: "Doe",
        password: "Cloud007"
      })
    expect(res.statusCode).toEqual(400)
    // expect(res.body).toHaveProperty('post')
  })
});

// to test put endpoint for user
describe('Put Endpoints', () => {
  it('should throw an error when updating an user', async () => {
    const res = await supertest(app)
      .put('/v1/user')
      .auth("jane.doe@example.com","Cloud007")
      .send({
        first_name: "Jane",
        last_name: "Doe"
      })
    expect(res.statusCode).toEqual(400)
    // expect(res.body).toHaveProperty('post')
  })
});

// to test get endpoint for user
describe('Get Endpoints', () => {
  it('should throw an error when retrieving a user', async () => {
    const res = await supertest(app)
      .get('/v1/user')
      .auth("jane.doe@example.com","Cloud007")
    expect(res.statusCode).toEqual(200)
    // expect(res.body).toHaveProperty('post')
  })
});

// to test the get endpoint for bill
describe('Get Endpoints', () => {
  it('should throw an error when getting bill', async () => {
    const res = await supertest(app)
      .post('/v2/bill')
      .auth("jane.doe@example.com","")
      .send({
        vendor: "Northeastern University",
        bill_date: "2020-01-06",
        due_date: "2020-01-12",
        amount_due: 7000.51,
        paymentStatus: "paid"
      })
    expect(res.statusCode).toEqual(401)
    // expect(res.body).toHaveProperty('post')
  })
});