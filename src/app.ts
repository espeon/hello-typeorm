require('dotenv').config();

import winston from './lib/winston.js'
import adapters from './adapters'
import prompts from 'prompts'
import { title } from 'process';

const testDB = async (title, description) => {
    let adapter = adapters.Default(process.env.DB_URL);
    let db = await adapter.getAdapter({debug:true});
    let hello = await db.createHello({title:title, description:description});
    let ret = await db.getHello(hello.id);
    console.log(ret);
}

const questions = [
    {
      type: 'text',
      name: 'title',
      message: 'Enter your title here',
      initial: 'World'
    },
    {
      type: 'text',
      name: 'description',
      message: 'Enter your description here',
      initial: 'My Amazing Description'
    }
  ];
   
  (async () => {
    const response = await prompts(questions);
   
    let { title, description } = response
    testDB(title, description);
  })();