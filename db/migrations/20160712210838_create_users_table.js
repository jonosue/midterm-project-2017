exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('users');
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
