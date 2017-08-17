exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('events_responses');
  return Promise.all([
    knex.schema.createTable('events_responses', function (table) {
      table.increments('id');
      table.integer('eventsdates_id').unsigned().references('id').inTable('events_dates');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.boolean('response');

    })
  ])
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('events_responses');
};
