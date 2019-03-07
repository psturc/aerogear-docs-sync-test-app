import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// gql is a utility function that handles gql queries
import gql from 'graphql-tag';

// createClient configures the Data Sync client based on options you provide
import {createClient,createOptimisticResponse} from '@aerogear/voyager-client';

// For our client application, we will connect to the local service.
let config = {
  httpUrl: "http://localhost:4000/graphql",
  wsUrl: "ws://localhost:4000/graphql",
}

const ADD_TASK = gql`
mutation createTask($title: String!){
    createTask(title: $title) @onlineOnly {
      id
      title
      version
    }
  }
`;

const GET_TASKS = gql`
  query getTasks {
    getTasks {
      id
      title
      version
    }
}
`;

let client;

async function helloWorld() {

  // Actually create the client
  client = await createClient(config);

  // Execute the hello query
  await client.query({
      fetchPolicy: 'network-only',
      query: gql`{ hello }`
    })
    //Print the response of the query
    .then( ({data}) => {
      console.log(data.hello)
    });

  await client.query({ query: GET_TASKS, fetchPolicy: 'network-only' }).then(({data}) => console.log(data.getTasks))
}

function query() {
  client.query({ query: GET_TASKS, fetchPolicy: 'cache-first' }).then(({data}) => console.log(data.getTasks))
}

async function create() {
  const item = { title: 'bbb', version: 1 };

  await client.mutate({
    mutation: ADD_TASK, variables: item,
    update: updateCacheOnAdd,
    optimisticResponse:
        createOptimisticResponse('createTask', 'Task', item),
  });

  function updateCacheOnAdd(cache, { data: { createTask } }) {
    let { getTasks } = cache.readQuery({ query: GET_TASKS });
    if (getTasks) {
      if (!getTasks.find((task) => task.id === createTask.id)) {
        getTasks.push(createTask);
      }
    } else {
      getTasks = [createTask];
    }
    cache.writeQuery({
      query: GET_TASKS,
      data: {
        'getTasks': getTasks
      }
    });
  }

  await client.query({ query: GET_TASKS }).then(({data}) => console.log(data.getTasks))
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => {
              e.preventDefault();
              helloWorld();
            }}
          >
            Initialize
          </a>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => {
              e.preventDefault();
              query();
            }}
          >
            Query
          </a>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => {
              e.preventDefault();
              create();
            }}
          >
            Create task
          </a>
        </header>
      </div>
    );
  }
}

export default App;
