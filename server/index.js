const express = require('express')
//Include our server libraries
const { VoyagerServer, gql } = require('@aerogear/voyager-server')
const { conflictHandler, strategies } = require('@aerogear/voyager-conflicts')
const { PubSub } = require('graphql-subscriptions');

const pubSub = new PubSub();

//Provide your graphql schema
const typeDefs = gql`
  type Query {
    hello: String
  }

  type Mutation {
    createTask(title: String!): Task
    updateTask(id: Int!, title: String!, version: Int!): Task
  }

  type Task {
    title: String
    version: Int
  }

  type Subscription {
    taskCreated: Task
  }
`

const tasks = [{
  title: 'aaa',
  version: 1
}];

function customResolutionStrategy(serverState, clientState) {
  return {
    title: `${serverState.title} ${clientState.title}`
  }
}

//Create the resolvers for your schema
const resolvers = {
  Query: {
    hello: (obj, args, context, info) => {
      return `Hello world`
    }
  },
  Mutation: {
    createTask: async (obj, args, context, info) => {
      args.version = 1;
      tasks.push(args)
      const result = args;
      pubSub.publish('TaskCreated', {
          taskCreated: result
        });
      return result
    },
    updateTask: async (obj, clientData, context, info) => {
      const args = {
        title: clientData.title,
        version: clientData.version
      }
      const task = { ...tasks[clientData.id] };

     // 2. Conflict Detection using `VersionedObjectState`
     //    If the version number from the database does not match the one sent by the client
     //    A conflict occurs
     if (conflictHandler.hasConflict(task, args)) {
       const { resolvedState, response } = await conflictHandler.resolveOnServer(customResolutionStrategy, task, args)
      
       tasks[clientData.id] = resolvedState;

       return response
     }

     // 3. Always call nextState before persisting the updated record.
     // This ensures it has the correct version number
     conflictHandler.nextState(args)

     // 4. Persist the update to the database and return it to the client
     tasks[clientData.id] = args;
  
      return tasks[clientData.id];
    }
  },
  Subscription: {
    taskCreated: {
        subscribe: () => pubSub.asyncIterator('TaskCreated')
    }
  },
}

//Initialize the library with your Graphql information
const server = VoyagerServer({
  typeDefs,
  resolvers
})

//Connect the server to express
const app = express()
server.applyMiddleware({ app })

// app.listen(4000, () =>
//   console.log(`🚀 Server ready at http://localhost:4000/graphql`)
// )

const http = require('http')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { execute, subscribe } = require('graphql');

const httpServer = http.createServer(app)

server.applyMiddleware({ app })
  httpServer.listen(4000, () => {
  new SubscriptionServer ({
    execute,
    subscribe,
    schema: server.schema
  }, {
    server: httpServer,
    path: '/graphql'
  })
})