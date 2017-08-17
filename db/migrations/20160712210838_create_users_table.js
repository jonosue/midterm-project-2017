exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('users');
  // return knex.schema.createTable('users', function (table) {
  //   table.increments('id');
  //   table.string('name');
  // });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
