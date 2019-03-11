const express = require('express')
//Include our server libraries
const { VoyagerServer, gql } = require('@aerogear/voyager-server')
const { conflictHandler, strategies } = require('@aerogear/voyager-conflicts')
const { PubSub } = require('graphql-subscriptions');
const { KeycloakSecurityService } = require('@aerogear/voyager-keycloak')
const fs = require('fs');
const path = require('path');
const metrics = require('@aerogear/voyager-metrics')
const auditLogger = require('@aerogear/voyager-audit')
const cors = require('cors')

const keycloakConfigPath = process.env.KEYCLOAK_CONFIG || path.resolve(__dirname, './keycloak.json')
const keycloakConfig = readConfig(keycloakConfigPath)
let keycloakService;
if (keycloakConfig) {
  keycloakService = new KeycloakSecurityService(keycloakConfig)
}

function readConfig(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`Warning: couldn't find config at ${path}`)
  }
}

const pubSub = new PubSub();

//Provide your graphql schema
const typeDefs = gql`
  type Query {
    hello: String
    uploads: [File]
    getTasks: [Task]
  }

  type Mutation {
    createTask(title: String!): Task
    updateTask(id: ID!, title: String!, version: Int!): Task
    singleUpload(file: Upload!): File!
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
  }

  type Task {
    id: ID
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

const files = [];

function customResolutionStrategy(serverState, clientState) {
  return {
    id: clientState.id,
    title: `${serverState.title} ${clientState.title}`
  }
}

//Create the resolvers for your schema
const resolvers = {
  Query: {
    hello: (obj, args, context, info) => {
      return `Hello world`
    },
    uploads: (obj, args, context, info) => {
      return files
    },
    getTasks: (obj, args, context, info) => {
      return tasks.map((task, index) => ({...task, id: index.toString()}))
    },
  },
  Mutation: {
    createTask: async (obj, args, context, info) => {
      args.version = 1;
      tasks.push(args)
      const result = {
        ...args,
        id: (tasks.length - 1).toString()
      };
      pubSub.publish('taskCreated', {
          taskCreated: result
        });
      return result
    },
    updateTask: async (obj, clientData, context, info) => {
      const args = {
        id: clientData.id,
        title: clientData.title,
        version: clientData.version
      }
      const id = Number(clientData.id)
      const task = { ...tasks[id], id: clientData.id };

     // 2. Conflict Detection using `VersionedObjectState`
     //    If the version number from the database does not match the one sent by the client
     //    A conflict occurs
     if (conflictHandler.hasConflict(task, args)) {
      //  const { resolvedState, response } = await conflictHandler.resolveOnServer(customResolutionStrategy, task, args)
      
      //  tasks[id] = resolvedState;
      //  delete tasks[id].id;

      //  return response

      const { response } = conflictHandler.resolveOnClient(task, args)
      return response
     }

     // 3. Always call nextState before persisting the updated record.
     // This ensures it has the correct version number
     conflictHandler.nextState(args)

     // 4. Persist the update to the database and return it to the client
     tasks[id] = { ...args };
     delete tasks[id].id;
  
      return args;
    },
    singleUpload: async (parent, { file }) => {
      const { stream, filename, mimetype, encoding } = await file;
      // Save file and return required metadata
      const writeStream = fs.createWriteStream(filename);
      stream.pipe(writeStream);
      const fileRecord = {
        filename,
        mimetype,
        encoding
      };
      files.push(fileRecord);
      return fileRecord;
    }
  },
  Subscription: {
    taskCreated: {
        subscribe: () => pubSub.asyncIterator('taskCreated')
    }
  },
}

//Initialize the library with your Graphql information
const server = VoyagerServer({
  typeDefs,
  resolvers
}, {
  securityService: keycloakService,
  metrics,
  auditLogger
})

//Connect the server to express
const app = express()

app.use(cors({ origin: '*' }))

metrics.applyMetricsMiddlewares(app, { path: '/metrics' })

if (keycloakService) {
  keycloakService.applyAuthMiddleware(app, { tokenEndpoint: true })
}

server.applyMiddleware({ app })

const http = require('http')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { execute, subscribe } = require('graphql');

const httpServer = http.createServer(app)

server.applyMiddleware({ app })

httpServer.listen(4000, () => {
  new SubscriptionServer ({
    execute,
    subscribe,
    onConnect: async connectionParams => {
      if (keycloakService) {
        return await keycloakService.validateToken(connectionParams)
      } else {
        return true;
      }
    },
    schema: server.schema
  }, {
    server: httpServer,
    path: '/graphql'
  })
})