const express = require('express');
const cors = require('cors');
const low = require('lowdb')
const shortid = require('shortid');
const FileSync = require('lowdb/adapters/FileSync')
const pluralize = require('pluralize');

const adapter = new FileSync('db.json')
const db = low(adapter)

const restResources = [
  'employees',
  'departments',
];
const dbDefaults = {};
restResources.forEach(item => dbDefaults[item] = [])
db.defaults(dbDefaults)
  .write()

const app = express();
const logger = function (req, res, next) {
  const {ip, url, method, body, params} = req;
  console.log({ip, url, method, params, body});
  next();
};

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(logger);

const notFoundHandler = (res) => res.status(404).json({message: 'not found'});

const listDefaultHandler = (res, resource) => res.status(200).json(db.get(resource).value());

const findDefaultHandler = (res, resource, id) => {
  const result = db.get(resource).find({id}).value();
  result ? res.status(200).json(result) : notFoundHandler(res)
}

const addDefaultHandler = (res, resource, body) => {
  const id = shortid.generate();
  db.get(resource).push({...body, id}).write();
  const result = db.get(resource).find({id}).value();
  res.status(201).json(result);
}

const updateDefaultHandler = (res, resource, id, body) => {
  const result = db.get(resource).find({id}).value();
  if (result) {
    const updated = {...result, ...body};
    db.get(resource).push(updated).write();
    res.status(200).json(updated);
  } else {
    notFoundHandler(res);
  }
}

const removeDefaultHandler = (res, resource, id) => {
  const item = db.get(resource).find({id}).value();
  if (item) {
    db.get(resource).remove({id}).write();
    res.status(204);
  } else {
    notFoundHandler(res);
  }
};

restResources.forEach((resource) => {
  const singular = pluralize.singular(resource);

  app.get(`/${resource}`, async (req, res) => {
    listDefaultHandler(res, resource)
  });

  app.get(`/${singular}/:id`, async (req, res) => {
    findDefaultHandler(res, resource, req.params.id)
  });

  app.post(`/${singular}`, async (req, res) => {
    addDefaultHandler(res, resource, req.body)
  });

  app.put(`/${singular}/:id`, async (req, res) => {
    updateDefaultHandler(res, resource, req.params.id, req.body)
  });

  app.delete(`/${singular}/:id`, (req, res) => {
    removeDefaultHandler(res, resource, req.params.id)
  });
});

app.all('*', (req, res) => {
  res.status(404).json({message: 'resource not exist'});
});

app.listen(8080, () => console.log('Api is listening on port 8080'))
