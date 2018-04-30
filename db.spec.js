const expect = require('chai').expect;
const db = require('./db');
const { Image } = db.models;
const smiley = require('./smiley');
const uuid = require('uuid/v4');

describe('Image model', ()=> {
  beforeEach(()=> {
    return db.sync();
  });
  it('exists', ()=> {
    expect(Image).to.be.ok;
  });
  describe('unit tests', ()=> {
    describe('both uploads are successful', ()=> {

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
            uri: generateUriFromKey(key)
          };
          return Promise.resolve(obj);
        };
        return image.save()
          .then( image => {
            expect(image.uris[key1]).to.equal(generateUriFromKey(key1));
            expect(image.uris[key2]).to.equal(generateUriFromKey(key2));
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
            expect(image.uris[key2]).to.equal(null);
          });
      });
    });
  });
  describe('integration tests', ()=> {
    it('an image can be created', ()=> {
      const key = uuid();
      const uris = {};
      uris[key] = smiley;
      const image = Image.build({ uris });
      const imageUri = `https://s3.amazonaws.com/${process.env.BUCKET}/${key}`;
      return image.save()
        .then( image => {
          expect(image.uris[key]).to.equal(imageUri)
        });
    });
  });
});
