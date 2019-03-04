const express = require('express')
//Include our server libraries
const { VoyagerServer, gql } = require('@aerogear/voyager-server')
const { conflictHandler, strategies } = require('@aerogear/voyager-conflicts')

//Provide your graphql schema
const typeDefs = gql`
  type Query {
    hello: String
  }

  type Mutation {
    updateTask(title: String!, version: Int!): Task
  }

  type Task {
    title: String
    version: Int
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
    updateTask: async (obj, clientData, context, info) => {
      const task = { ...tasks[0] };

     // 2. Conflict Detection using `VersionedObjectState`
     //    If the version number from the database does not match the one sent by the client
     //    A conflict occurs
     if (conflictHandler.hasConflict(task, clientData)) {
       const { resolvedState, response } = await conflictHandler.resolveOnServer(customResolutionStrategy, task, clientData)
      
       tasks[0] = resolvedState;

       return response
     }

     // 3. Always call nextState before persisting the updated record.
     // This ensures it has the correct version number
     conflictHandler.nextState(clientData)

     // 4. Persist the update to the database and return it to the client
     tasks[0] = clientData;
  
      return tasks[0];
    }
  }
}

//Initialize the library with your Graphql information
const server = VoyagerServer({
  typeDefs,
  resolvers
})

//Connect the server to express
const app = express()
server.applyMiddleware({ app })

app.listen(4000, () =>
  console.log(`🚀 Server ready at http://localhost:4000/graphql`)
)