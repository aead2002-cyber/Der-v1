using Microsoft.EntityFrameworkCore;

namespace DER3.Api.Data
{
    public class Der3DbContext : DbContext
    {
        public Der3DbContext(DbContextOptions<Der3DbContext> options)
            : base(options)
        {
        }
    }
}