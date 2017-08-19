
// $(document).on('click', '.input-remove-row', function(){
//     var tr = $(this).closest('tr');
//     tr.fadeOut(200, function(){
//         tr.remove();
//         calc_total()
//     });
// });

$(function(){
    $('.preview-add-button').click(function(){
        var form_data = {};
        var mydate = $('.payment-form input[name="date"]').val().replace(/T/i, ' At ');
        if (mydate) {
        form_data["date"] = mydate;
        }

        var row = $('<tr></tr>');
        $.each(form_data, function( type, value ) {
            $('<td class="input-'+type+'"></td>').html(value).appendTo(row);
        });
        $('.preview-table > tbody:last').append(row);
        //console.logging (all the dates)
        $(".preview-table tbody tr td").each(function( index, value ) {
        console.log( index + ": " + $(value).text() );
        });
    });
});
