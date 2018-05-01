const expect = require('chai').expect;
const db = require('./db');
const { Image } = db.models;
const smiley = require('./smiley');
const frowny = require('./frowny');
const uuid = require('uuid/v4');
const AWS = require('aws-sdk');

describe('Image model', ()=> {

  beforeEach(()=> {
    return db.sync();
  });
  it('exists', ()=> {
    expect(Image).to.be.ok;
  });
  describe('unit tests', ()=> {
    describe('creating', ()=> {
      describe('both uploads are successful', ()=> {
        it('an image can be created', ()=> {
          const uris = {};
          const key1 = uuid();
          const key2 = uuid();
          const key3 = uuid();
          uris[key1] = smiley;
          uris[key2] = smiley;
          const image = Image.build({
            uris
          });
          const imageUri = 'http://aws.com/image-uri';
          const generateUriFromKey = (key)=>`${imageUri}-${key}`;
          image.saveToCloud = (key)=> { 
            const obj = {
              key,
              uri: generateUriFromKey(key)
            };
            return Promise.resolve(obj);
          };
          return image.save()
            .then( image => {
              expect(image.uris[key1]).to.equal(generateUriFromKey(key1));
              expect(image.uris[key2]).to.equal(generateUriFromKey(key2));
              image.uris = { };
              image.uris[key2] = null;
              image.uris[key3] = smiley;
              image.removeFromCloud = (key)=> {
                return Promise.resolve({ key, uri: null });

              }
              return image.save();
            })
            .then( image => {
              expect(image.uris[key1]).to.equal(generateUriFromKey(key1));
              expect(image.uris[key3]).to.equal(generateUriFromKey(key3));
              expect(image.uris[key2]).to.not.be.ok;
            });
        });
      });
      describe('one upload is successful out of two', ()=> {
        it('an image can be created', ()=> {
          const uris = {};
          const key1 = uuid();
          const key2 = uuid();
          uris[key1] = smiley;
          uris[key2] = smiley;
          const image = Image.build({
            uris
          });
          const imageUri = 'http://aws.com/image-uri';
          const generateUriFromKey = (key)=>`${imageUri}-${key}`;
          image.saveToCloud = (key)=> { 
            const obj = {
              key,
              uri: key === key1 ? generateUriFromKey(key): null
            };
            return Promise.resolve(obj);
          };
          return image.save()
            .then( image => {
              expect(image.uris[key1]).to.equal(generateUriFromKey(key1));
              expect(image.uris[key2]).not.to.be.ok;
            });
        });
      });
    });
  });
  describe('integration tests', ()=> {
    /*
    beforeEach(()=> {
      return new Promise((resolve, reject)=> {
        const S3 = new AWS.S3();
        S3.listObjects({ Bucket: process.env.BUCKET}, (err, data)=>{
          if(err){
            return reject(err);
          }
          Promise.all(data.Contents.map( object => {
            return new Promise((resolve, reject)=> {
              S3.deleteObject({
                Bucket: process.env.BUCKET,
                Key: object.Key
              }, (err, data)=> {
                resolve();
              })
            });
          }))
          .then(()=> {
            resolve();
          })
        })
      });
    });
    */
    
    it('an image can be created', ()=> {
      const uris = {};
      const key1 = uuid();
      const key2 = uuid();
      const key3 = uuid();
      uris[key1] = smiley;
      uris[key2] = frowny;
      uris[key3] = smiley;
      const image = Image.build({ uris });
      const imageUri = (key)=> `https://s3.amazonaws.com/${process.env.BUCKET}/${key}`;
      return image.save()
        .then( image => {
          expect(image.uris[key1]).to.equal(imageUri(key1))
          expect(image.uris[key2]).to.equal(imageUri(key2))
          expect(image.uris[key3]).to.equal(imageUri(key3))
          const obj = {};
          obj[key1] = null;
          image.uris = obj;
          return image.save();
        })
        .then( image => {
          expect(image.uris[key1]).to.not.be.ok;
          expect(image.uris[key2]).to.equal(imageUri(key2))
          expect(image.uris[key3]).to.equal(imageUri(key3))
        });
    });
  });
});
