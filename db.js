const Sequelize = require('sequelize');
const conn = new Sequelize(process.env.DATABASE_URL, { logging: false });
const AWS = require('aws-sdk');
const env = process.env.ENV;
if(env === 'TEST'){
  AWS.config.loadFromPath('./test.config.json');
}

const Image = conn.define('image', {
  uris: {
    type: Sequelize.JSONB,
    defaultValue: {}
  },
},{
  hooks: {
    beforeUpdate: function(image){
      //loop over new images or deletions
      return Promise.all(
        Object.keys(image.uris).reduce( (memo, key) => {
          memo.push(image.uris[key] ? image.saveToCloud(key):image.removeFromCloud(key) );
          return memo;
        }, [])
      )
      .then( uploads => {
        //merge with previous data
        image.uris = uploads.reduce((memo, result)=> {
          memo[result.key] = result.uri;
          return memo;
        }, image._previousDataValues.uris);
        //remove null values
        image.uris = Object.keys(image.uris).reduce((memo, key)=> {
          if(image.uris[key]){
            memo[key] = image.uris[key];
          }
          return memo;
        }, {}); 
      });
    },
    beforeCreate: function(image){
      //loop over images and upload for each image
      return Promise.all(
        Object.keys(image.uris).reduce( (memo, key) => {
          memo.push(image.saveToCloud(key));
          return memo;
        }, [])
      )
      .then( uploads => {
        //only set if image uri has been set
        image.uris = uploads.reduce((memo, result)=> {
          if(result.uri){
            memo[result.key] = result.uri;
          }
          return memo;
        }, {});
      });
    }
  }
});

//resolves with object - key and url
Image.prototype.saveToCloud = function(key){
  return new Promise((resolve, reject)=> {
    const S3 = new AWS.S3();
    S3.createBucket({ Bucket: process.env.BUCKET}, (err, bucket)=>{
      if(err){
        return reject(err);
      }
      const data = this.uris[key];
      const extensions = data.split(';')[0].split('/');
      const extension = extensions[extensions.length - 1];
      const Body = new Buffer(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      S3.upload({
        Bucket: process.env.BUCKET,
        Key: key,
        Body: Body,
        ContentType: `image/${extension}`,
        ACL: 'public-read',
      }, (err, data)=>{
        if(err){
          return reject(err);
        }
        resolve({uri: data.Location, key });
      });
    });
  });
}

Image.prototype.removeFromCloud = function(key){
  return new Promise((resolve, reject)=> {
    const S3 = new AWS.S3();
    S3.createBucket({ Bucket: process.env.BUCKET}, (err, bucket)=>{
      if(err){
        return reject(err);
      }
      S3.deleteObject({
        Bucket: process.env.BUCKET,
        Key: key,
      }, (err, data)=>{
        if(err){
          return reject(err);
        }
        resolve({uri: null, key });
      });
    });
  });
}

const sync = ()=> conn.sync({ force: true });

module.exports = {
  sync,
  models: {
    Image
  }
};
