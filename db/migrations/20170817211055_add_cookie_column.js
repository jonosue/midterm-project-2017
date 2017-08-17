exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('events', function(table){
      table.string('cookie_value');
    })
  ])
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.table('events', function(table){
      table.dropColumn('cookie_value');
    })
  ])
};
