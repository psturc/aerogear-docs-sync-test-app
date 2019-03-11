import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// gql is a utility function that handles gql queries
import gql from 'graphql-tag';

// createClient configures the Data Sync client based on options you provide
import {createClient,createOptimisticResponse, WebNetworkStatus} from '@aerogear/voyager-client';

const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI5UU84Rnh2S2d3VkxtNHVxaTJBUHQ5enhlZ1dTV2ZJZndFZXcxSUhKUk40In0.eyJqdGkiOiI0ZDNhODZkMS0zYTg0LTQ3NGYtYTRhZC1iZTk4NGRjNTY0YWMiLCJleHAiOjE1NTIzMDcwNjQsIm5iZiI6MCwiaWF0IjoxNTUyMzA3MDA0LCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODEvYXV0aC9yZWFsbXMvbWFzdGVyIiwiYXVkIjoiYWNjb3VudCIsInN1YiI6ImQ2ZGI0YWE2LWI3NjMtNGZlZC04NTExLWU0NzEyNTVlNDQyOSIsInR5cCI6IkJlYXJlciIsImF6cCI6InRlc3QiLCJhdXRoX3RpbWUiOjE1NTIzMDU5MzMsInNlc3Npb25fc3RhdGUiOiIzODI0MjYxNi1lOWYwLTQwODctYTMzYy1iNDQwMzgyYTdiZjIiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInByZWZlcnJlZF91c2VybmFtZSI6InRlc3QifQ.Is73GMSgaORUjn14XcPJgBXX-n6_zqwLjCspUkwH4mcf3JqFMZ9ztuZ6Fs1ghEQOLYxpQZt3EwX56fNgte5ZHuZv5hoiKQBvC8FnHe6xBBF3CtAPbraQ961odVbi9iF_SEMGtaINrlAEjtC75iDgyIwlKCk9s0-evH6hN48rl0jjM9kOgZ8Z8JslM9lToEqSiKZVGr4UERuLKHZPos3jknJaUEDvUxFb96WbiOqa_46Ecne5vXs9xRkRy1ZWj3D67NxOKvlXhhrTivfsXEo4720CogQ9w8yGkpsRoAX81QERg0vHJ0FLx4DO9e2rxZoMiHpbRj3IrVZjokGP2VEBrw";


let updateTaskConflictResolver = (serverData, clientData) => {
  console.log('conflict resolver');
  // return {
  //   ...serverData,
  //   title: serverData.title + ' ' + clientData.title
  // };
  return clientData;
};

// For our client application, we will connect to the local service.
let config = {
  httpUrl: "/graphql",
  wsUrl: "ws://localhost:4000/graphql",
  mergeOfflineMutations: false,
  offlineQueueListener: {
    onOperationEnqueued: console.log,
    onOperationSuccess: console.log,
    onOperationFailure: console.log,
    queueCleared: console.log
  },
  conflictStrategy: {
    // strategies: {
    //   "updateTask": updateTaskConflictResolver,
    // },
    default: updateTaskConflictResolver
  },
  conflictListener: {
    conflictOccurred: function(operationName, resolvedData, server, client) {
      console.log(`data: ${JSON.stringify(resolvedData)}, server: ${JSON.stringify(server)} client: ${JSON.stringify(client)} `);
    }
  },
  authContextProvider: function() {
    return {
      header: {
        "Authorization": `Bearer ${token}`
      },
      token: token
    }
  },
  fileUpload: true,
  auditLogging: true,
}

export const UPLOAD_FILE = gql`
mutation singleUpload($file: Upload!) {
  singleUpload(file: $file) {
    filename
  }
}
`;

const ADD_TASK = gql`
mutation createTask($title: String!){
    createTask(title: $title) @onlineOnly {
      id
      title
      version
    }
  }
`;

const UPDATE_TASK = gql`
mutation updateTask($id: ID!, $title: String!, $version: Int!){
  updateTask(id: $id, title: $title, version: $version) {
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

const TASK_ADDED_SUBSCRIPTION = gql`
  subscription taskCreated {
    taskCreated {
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

function watchQuery() {
  const tasks = client.watchQuery({
    query: GET_TASKS,
    fetchPolicy: 'cache-first',
      errorPolicy: 'none'
  });

  tasks.subscribeToMore({
    document: TASK_ADDED_SUBSCRIPTION,
    updateQuery: (prev, { subscriptionData }) => {
      if(subscriptionData.data){
        const newTask = subscriptionData.data.taskCreated;
        if (prev.getTasks.find(task => task.id === newTask.id)) {
          return prev;
        } else {
          return Object.assign({}, prev, {
            getTasks: [...prev.getTasks, newTask]
          });
        }
      }
    },
    onError: console.log
  });
  return tasks;
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

async function update() {
  const { data: { getTasks } } = await client.query({ query: GET_TASKS })
  const item = { ...getTasks[0], title: 'ccc' };

  await client.mutate({
    mutation: UPDATE_TASK, variables: item,
  });

  await client.query({ query: GET_TASKS }).then(({data}) => console.log(data.getTasks))
}

async function fileUpload(file) {
  console.log(file);
  const res = await client.mutate({
    mutation: UPLOAD_FILE,
    variables: { file }
  });
  console.log(res);
}

const networkStatus = new WebNetworkStatus();

networkStatus.onStatusChangeListener({
  onStatusChange(networkInfo) {
    const online = networkInfo.online;
    if (online) {
      client.watchQuery({
        query: GET_TASKS
      });
    }
  }
});

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
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => {
              e.preventDefault();
              update();
            }}
          >
            Update task
          </a>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => {
              e.preventDefault();
              watchQuery().subscribe(console.log);
            }}
          >
            Watch
          </a>
          <input
            type="file"
            required
            onChange={({ target: { validity, files: [file] } }) =>
              validity.valid && fileUpload(file)
            }
          />
        </header>
      </div>
    );
  }
}

export default App;
