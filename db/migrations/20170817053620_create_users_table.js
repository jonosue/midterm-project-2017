exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('users');
  return Promise.all([
    knex.schema.createTable('users', function (table) {
      table.increments('id');
      table.string('first_name');
      table.string('last_name');
      table.string('email');
    })
  ])
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
