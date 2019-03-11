import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

// gql is a utility function that handles gql queries
import gql from 'graphql-tag';

// createClient configures the Data Sync client based on options you provide
import {createClient,createOptimisticResponse, WebNetworkStatus} from '@aerogear/voyager-client';

const token = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI5UU84Rnh2S2d3VkxtNHVxaTJBUHQ5enhlZ1dTV2ZJZndFZXcxSUhKUk40In0.eyJqdGkiOiI1Y2FiMGZiZC04ZTRiLTQ5NmQtOWExMC02OTcwZjNjZGIwNDkiLCJleHAiOjE1NTIwNTc3NTIsIm5iZiI6MCwiaWF0IjoxNTUyMDU3NjkyLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODEvYXV0aC9yZWFsbXMvbWFzdGVyIiwiYXVkIjpbIm1hc3Rlci1yZWFsbSIsImFjY291bnQiXSwic3ViIjoiMzZiMmQzZmEtZjdjMS00ZWJlLThmYTEtMWEyZjRmNTgxM2RkIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoidGVzdCIsImF1dGhfdGltZSI6MTU1MjA1NzU5OCwic2Vzc2lvbl9zdGF0ZSI6ImRiMDQzOTRhLTczNDYtNDYzYi1iMmVkLWZhMTA5ZWRjNmFiYSIsImFjciI6IjAiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiY3JlYXRlLXJlYWxtIiwib2ZmbGluZV9hY2Nlc3MiLCJhZG1pbiIsInVtYV9hdXRob3JpemF0aW9uIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsibWFzdGVyLXJlYWxtIjp7InJvbGVzIjpbInZpZXctcmVhbG0iLCJ2aWV3LWlkZW50aXR5LXByb3ZpZGVycyIsIm1hbmFnZS1pZGVudGl0eS1wcm92aWRlcnMiLCJpbXBlcnNvbmF0aW9uIiwiY3JlYXRlLWNsaWVudCIsIm1hbmFnZS11c2VycyIsInF1ZXJ5LXJlYWxtcyIsInZpZXctYXV0aG9yaXphdGlvbiIsInF1ZXJ5LWNsaWVudHMiLCJxdWVyeS11c2VycyIsIm1hbmFnZS1ldmVudHMiLCJtYW5hZ2UtcmVhbG0iLCJ2aWV3LWV2ZW50cyIsInZpZXctdXNlcnMiLCJ2aWV3LWNsaWVudHMiLCJtYW5hZ2UtYXV0aG9yaXphdGlvbiIsIm1hbmFnZS1jbGllbnRzIiwicXVlcnktZ3JvdXBzIl19LCJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhZG1pbiJ9.AW3HyRpr37vvRh78XqkZYbQn-Nws4Y849y2S6iFSam8z7MP04pnTExl1boS56YKLRDiiNpSj353o-qU0IZkqSZcYqlmgyXF2ePxyKZLNIB_o2anCETB-_fVgxfrdt-PhmFgJ_M3wBe13PuFkKb4m3AnUrV1MXBHKlO-zTFiZe-LsMR75tjZ9EGL-ceJjllI2gRFocexmvpsiCcdQsTBS3VOJdTyPs6Z-TtIaVxhGdXDzXb8gDMFGPhC888ht4L2gla3NGX74wBQaQg8CrZ2FoR8tRFaQgkt0rg1Kn-R7OypjP09yFm0EY4I549yHg9UX6btpIm1OSzY7SpCLuP-SFQ";


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
  httpUrl: "http://localhost:4000/graphql",
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
        </header>
      </div>
    );
  }
}

export default App;
