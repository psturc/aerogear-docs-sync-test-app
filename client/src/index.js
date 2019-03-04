// gql is a utility function that handles gql queries
import gql from 'graphql-tag';

// createClient configures the Data Sync client based on options you provide
import {createClient} from '@aerogear/voyager-client';

// For our client application, we will connect to the local service.
let config = {
  httpUrl: "http://localhost:4000/graphql",
  wsUrl: "ws://localhost:4000/graphql",
}

async function helloWorld() {

  // Actually create the client
  let client = await createClient(config);

  // Execute the hello query
  client.query({
      fetchPolicy: 'network-only',
      query: gql`{ hello }`
    })
    //Print the response of the query
    .then( ({data}) => {
      console.log(data.hello)
    });
}

helloWorld();